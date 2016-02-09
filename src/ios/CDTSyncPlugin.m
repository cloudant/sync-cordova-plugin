/*
 * Copyright (c) 2015 IBM Corp. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 *
 */

#include <sys/types.h>
#include <sys/sysctl.h>

#import <Cordova/CDV.h>
#import <CDTDatastore/CloudantSync.h>
#import <CDTDatastore/CloudantSyncEncryption.h>
#import "CDTSyncPlugin.h"
#import "CDTSyncPluginDelegate.h"
#import "CDTSyncPluginInterceptor.h"

#define kCDTDocId @"_id"
#define kCDTDocRev @"_rev"
#define kCDTDocDeleted @"_deleted"

#define kCDTDocAttachments @"_attachments"
#define kCDTDocAttachmentContentType @"contentType"
#define kCDTDocAttachmentData @"data"

// Query
#define kCDTQuerySelector   @"selector"
#define kCDTQuerySort       @"sort"
#define kCDTQueryLimit      @"limit"
#define kCDTQuerySkip       @"skip"


@interface CDTDatastore (Manager)
// This property exists on the datastore, it is only declared in the implementation
// however thus we need this exention.
    @property (readonly) CDTDatastoreManager * manager;
@end

@implementation CDTDatastore (Manager)
@end


@interface CDTSyncPlugin ()

@property NSMutableDictionary *datastoreMap;
@property NSMutableDictionary *replicatorMap;
@property NSMutableDictionary *delegateMap;
@property NSMutableDictionary *interceptorMap;
@property NSMutableDictionary<NSNumber*,CDTDatastoreManager*> *datastoreManagers;

@end

@implementation CDTSyncPlugin

-(void) pluginInitialize
{
    self.datastoreMap = [NSMutableDictionary dictionary];
    self.replicatorMap = [NSMutableDictionary dictionary];
    self.delegateMap = [NSMutableDictionary dictionary];
    self.interceptorMap = [NSMutableDictionary dictionary];
    self.datastoreManagers = [NSMutableDictionary dictionary];
}

- (void)createDatastoreManager:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult * result = nil;
        NSError *error = nil;
        NSString *path = [command argumentAtIndex:0];

        CDTDatastoreManager *manager = [[CDTDatastoreManager alloc]initWithDirectory:path error:&error];


        if (error){
            NSString *msg = [NSString stringWithFormat:@"Failed to create DatastoreManager. Error: %@", error];
            result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:msg];
        } else {
            NSNumber *dsmID = @(self.datastoreManagers.count);
            self.datastoreManagers[dsmID] = manager;
            result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:@{@"id":dsmID}];
        }
        [self.commandDelegate sendPluginResult:result callbackId:command.callbackId];

    }];
}


#pragma mark - Database Create/Delete
- (void)openDatastore:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        // Create the Cordova response
        CDVPluginResult* pluginResult = nil;

        NSMutableDictionary* result = [NSMutableDictionary dictionary];
        NSNumber *datastoreManagerID = [command argumentAtIndex:0];
        NSString *name = [command argumentAtIndex:1];
        NSString *keyProviderPassword = [command argumentAtIndex:2];

        CDTDatastore *datastore = [self.datastoreMap objectForKey:name];
        NSError *error = nil;
        if(!datastore){
            // If there is no cached store, create one
            CDTDatastoreManager *manager = self.datastoreManagers[datastoreManagerID];
            datastore = [manager datastoreNamed:name error:&error];

            if(!error && datastore){
                // Cache the CDTDatastore so that replication does not require the password/identifier again.
                [self.datastoreMap setObject:datastore forKey:name];
            }else{
                datastore = nil;
            }
        }

        if(!error){
            // Store was either created or pulled from cache
            [result setObject:datastore.name forKey:@"name"];
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:result];
        }else{
            // error. store could not be created
            NSLog(@"Create local store error: failed to create store named %@",name);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[NSString stringWithFormat: NSLocalizedString(@"Failed to create local store named %@. Error: %@", nil), name, error]];
        }

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

-(void)deleteDatastore:(CDVInvokedUrlCommand *)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;
        NSNumber *datastoreManagerID = [command argumentAtIndex:0];
        NSString *name = [command argumentAtIndex:1];

        NSError *error;
        CDTDatastoreManager * manager = self.datastoreManagers[datastoreManagerID];
        [manager deleteDatastoreNamed:name error:&error];
        [self.datastoreMap removeObjectForKey:name];

        if(!error){
            // Store was either created or pulled from cache
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        }else{
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[NSString stringWithFormat: NSLocalizedString(@"Failed to delete datastore named %@. Error: %@", nil), name, error]];

        }
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

#pragma mark - CRUD operations
- (void)save:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;
        NSString *name = [command argumentAtIndex:0];
        NSDictionary *docRevisionJSON = [command argumentAtIndex:1];

        // Lookup store in cache
        CDTDatastore *cachedStore = self.datastoreMap[name];
        if(cachedStore){
            NSError *jsonConversionError = nil;
            CDTDocumentRevision *revision = [self convertJSONToDocument:docRevisionJSON error:&jsonConversionError];
            if(!jsonConversionError){
                // perform save
                CDTDocumentRevision *savedRevision = nil;

                BOOL isCreate = !revision.revId;

                NSError *error;
                if(isCreate){
                    savedRevision = [cachedStore createDocumentFromRevision:revision error:&error];
                }else{
                    savedRevision = [cachedStore updateDocumentFromRevision:revision error:&error];
                }

                if(!error){
                    NSDictionary *resultJSON = [self convertDocumentToJSON:savedRevision error:&jsonConversionError];
                    if(!jsonConversionError){
                        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:resultJSON];
                    }else{
                        // Error occurred, create response
                        NSString *errorMessage = [NSString stringWithFormat: @"Document save error:%@",[error.userInfo objectForKey:NSLocalizedDescriptionKey]];
                        NSLog(@"%@", errorMessage);
                        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[NSString stringWithFormat: NSLocalizedString(@"Failed to save document revision with docId %@.  Error: %@", nil), savedRevision.docId, jsonConversionError]];
                    }
                } else {
                    // Error occurred, create response
                    NSLog(@"Document save error:%@",[error.userInfo objectForKey:NSLocalizedDescriptionKey]);
                    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[NSString stringWithFormat: NSLocalizedString(@"Failed to save document revision.  Error: %@", nil), error]];
                }
                [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];

            }else{
                // Error occurred, create response
                NSString *errorMessage = [NSString stringWithFormat:NSLocalizedString(@"Document save error:%@", nil), jsonConversionError];
                NSLog(@"%@", errorMessage);
                pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString: errorMessage];
                [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            }
        } else {
            // No cached store was found.  error
            NSLog(@"Document save error: the store named %@ must first be created.",name);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[NSString stringWithFormat: NSLocalizedString(@"The store named %@ must first be created before saving a document", nil), name]];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            return;
        }
    }];
}

- (void)getDocument:(CDVInvokedUrlCommand *)command
{
    [self.commandDelegate runInBackground:^{
        __block CDVPluginResult* pluginResult = nil;
        NSString *name = [command argumentAtIndex:0];
        NSString *docId = [command argumentAtIndex:1];

        // Lookup store in cache
        CDTDatastore *cachedStore = self.datastoreMap[name];
        if(cachedStore){
            // perform fetch
            NSError *error = nil;
            CDTDocumentRevision *fetchedRevision = [cachedStore getDocumentWithId:docId error:&error];
            if(!error){
                NSError *jsonConversionError = nil;
                NSDictionary *result = [self convertDocumentToJSON:fetchedRevision error:&jsonConversionError];
                if(!jsonConversionError){
                    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:result];
                }else{
                    // Error occurred, create response
                    NSString *errorMessage = [NSString stringWithFormat: @"Document fetchById error:%@",[error.userInfo objectForKey:NSLocalizedDescriptionKey]];
                    NSLog(@"%@", errorMessage);
                    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[NSString stringWithFormat: NSLocalizedString(@"Failed to fetch document revision with docId %@.  Error: %@", nil), fetchedRevision.docId, jsonConversionError]];
                }
            } else {
                // Error occurred, create response
                NSLog(@"Document fetchById error:%@",[error.userInfo objectForKey:NSLocalizedDescriptionKey]);
                pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[NSString stringWithFormat: NSLocalizedString(@"Failed to fetch document revision with docId %@.  Error: %@", nil), docId, error]];
            }
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            return;
        } else {
            // No cached store was found.  error
            NSLog(@"Document fetchById error: the store named %@ must first be created.",name);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[NSString stringWithFormat: NSLocalizedString(@"The store named %@ must first be created before fetching a document", nil), name]];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            return;
        }
    }];
}

- (void)deleteDocumentFromRevision:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;
        NSString *name = [command argumentAtIndex:0];
        NSDictionary *docRevisionJSON = [command argumentAtIndex:1];

        // Lookup store in cache
        CDTDatastore *cachedStore = self.datastoreMap[name];
        if(cachedStore){
            NSError *jsonConversionError = nil;
            CDTDocumentRevision *revisionToDelete = [self convertJSONToDocument:docRevisionJSON error:&jsonConversionError];


            if(!jsonConversionError){
                NSError *error = nil;
                CDTDocumentRevision *deletedRevision = [cachedStore deleteDocumentFromRevision:revisionToDelete error:&error];

                // perform delete
                if(!error){
                    NSDictionary *result = [self convertDocumentToJSON:deletedRevision error:&jsonConversionError];
                    if(!jsonConversionError){
                        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:result];
                    }else{
                        // Error occurred, create response
                        NSString *errorMessage = [NSString stringWithFormat: @"Document fetchById error:%@",[error.userInfo objectForKey:NSLocalizedDescriptionKey]];
                        NSLog(@"%@", errorMessage);
                        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[NSString stringWithFormat: NSLocalizedString(@"Failed to fetch document revision with docId %@.  Error: %@", nil), deletedRevision.docId, jsonConversionError]];
                    }
                } else {
                    // Error occurred, create response
                    NSLog(@"Document delete error:%@",[error.userInfo objectForKey:NSLocalizedDescriptionKey]);
                    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[NSString stringWithFormat: NSLocalizedString(@"Failed to save document revision.  Error: %@", nil), error]];
                }
                [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            }else{
                // Error occurred, create response
                NSString *errorMessage = [NSString stringWithFormat:NSLocalizedString(@"Document delete error:%@", nil), jsonConversionError];
                NSLog(@"%@", errorMessage);
                pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString: errorMessage];
                [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            }
        } else {
            // No cached store was found.  error
            NSLog(@"Document delete error: the store named %@ must first be created.",name);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:[NSString stringWithFormat: NSLocalizedString(@"The store named %@ must first be created before saving a document", nil), name]];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            return;
        }
    }];
}

#pragma mark - Index methods
-(void)ensureIndexed:(CDVInvokedUrlCommand *)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;
        NSString *name = [command argumentAtIndex:0];
        NSArray *fields = [command argumentAtIndex:2];
        NSString *indexName = [command argumentAtIndex:1];

        // Lookup store in cache
        CDTDatastore *cachedStore = self.datastoreMap[name];
        if(cachedStore){
            NSString *message = [cachedStore ensureIndexed:fields withName:indexName];
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:message];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            return;
        } else {
            // No cached store was found.  error
            NSString *message = [NSString stringWithFormat: NSLocalizedString(@"Index create error: the store named %@ must first be created", nil), name];
            NSLog(@"%@",message);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:message];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            return;
        }
    }];
}

-(void)deleteIndexNamed:(CDVInvokedUrlCommand *)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;
        NSString *name = [command argumentAtIndex:0];
        NSString *indexName = [command argumentAtIndex:1];

        // Lookup store in cache
        CDTDatastore *cachedStore = self.datastoreMap[name];
        if(cachedStore){
            BOOL message = [cachedStore deleteIndexNamed:indexName];
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:message];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            return;
        } else {
            // No cached store was found.  error
            NSString *message = [NSString stringWithFormat: NSLocalizedString(@"Index delete error: the store named %@ must first be created", nil), name];
            NSLog(@"%@",message);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:message];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            return;
        }
    }];
}

#pragma mark - Query methods
-(void)find:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        CDVPluginResult* pluginResult = nil;
        NSString *name = [command argumentAtIndex:0];
        NSDictionary *cloudantQueryDictionary = [command argumentAtIndex:1];

        // Lookup store in cache
        CDTDatastore *cachedStore = self.datastoreMap[name];
        if(cachedStore){
            NSDictionary *selector = cloudantQueryDictionary[kCDTQuerySelector];

            if(!selector)
                selector = [NSDictionary dictionary];

            NSArray *sortDescriptors = cloudantQueryDictionary[kCDTQuerySort];
            NSNumber *limit = cloudantQueryDictionary[kCDTQueryLimit];
            NSNumber *skip = cloudantQueryDictionary[kCDTQuerySkip];

            NSMutableArray *jsonObjects = [NSMutableArray array];
            __block NSError *jsonConvertError = nil;
            CDTQResultSet *result = [cachedStore find:selector skip:[skip integerValue] limit:[limit integerValue] fields:nil sort:sortDescriptors];
            [result enumerateObjectsUsingBlock:^(CDTDocumentRevision *rev, NSUInteger idx, BOOL *stop) {
                [jsonObjects addObject:[self convertDocumentToJSON:rev error:&jsonConvertError]];
                if(jsonConvertError){
                    NSLog(@"Conversion error for revision with docId %@.  Error: %@",rev.docId, jsonConvertError);
                    jsonConvertError = nil;
                }
            }];

            // if all CDTDocumentRevisions were successful, then return the array.
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:jsonObjects];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            return;
        } else {
            // No cached store was found.  error
            NSString *message = [NSString stringWithFormat: NSLocalizedString(@"Query error: the store named %@ must first be created", nil), name];
            NSLog(@"%@",message);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:message];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            return;
        }
    }];
}

#pragma mark - Replication
-(void)createReplicator:(CDVInvokedUrlCommand *)command
{
    [self.commandDelegate runInBackground:^{
        NSDictionary *replicatorJson = [command argumentAtIndex:0];
        NSString *type      = [replicatorJson objectForKey:@"type"];
        NSDictionary *datastore = [replicatorJson objectForKey:@"datastore"];
        NSString *storeName = [datastore objectForKey:@"name"];
        NSString *urlString = [replicatorJson objectForKey:@"uri"];
        NSNumber *token = [replicatorJson valueForKey:@"token"];
        NSError *error = nil;
        NSString *message;
        CDVPluginResult *pluginResult;

        // get local store
        CDTDatastore *localstore = [self.datastoreMap objectForKey:storeName];
        if (!localstore){
            // Error
            NSString *message = [NSString stringWithFormat:NSLocalizedString(@"No open CDTDatastore. First call StoreFactory.localStore to create or open Store.", nil)];
            NSLog(@"%@",message);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:message];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            return;
        }

        NSURL *url = [NSURL URLWithString: [NSString stringWithFormat:urlString, storeName]];
        CDTReplicator *replicator = nil;
        CDTSyncPluginInterceptor *interceptor = [[CDTSyncPluginInterceptor alloc] initWithCommandDelegate:self.commandDelegate callbackId:command.callbackId];
        if ([type isEqualToString:@"pull"]){
            // pull replication
            CDTPullReplication *pull = [CDTPullReplication replicationWithSource:url target:localstore];
            [pull addInterceptor:interceptor];
            CDTReplicatorFactory *replicatorFactory = [[CDTReplicatorFactory alloc] initWithDatastoreManager: localstore.manager];
            replicator = [replicatorFactory oneWay:pull error:&error];
        } else if ([type isEqualToString:@"push"]){
            NSError *error = nil;
            // push replication
            CDTPushReplication *push = [CDTPushReplication replicationWithSource:localstore target:url];
            [push addInterceptor:interceptor];
            CDTReplicatorFactory *replicatorFactory = [[CDTReplicatorFactory alloc] initWithDatastoreManager: localstore.manager];
            replicator = [replicatorFactory oneWay:push error:&error];
            if (replicator){
                [self.replicatorMap setObject:replicator forKey:[token stringValue]];
            }
        } else {
            // Error
            NSString *message = [NSString stringWithFormat:NSLocalizedString(@"createReplicator error: unrecognized type %@", nil), type];
            NSLog(@"%@",message);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:message];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
            return;
        }

        if (error){
            // Error occurred, create response
            NSString *message = [NSString stringWithFormat:NSLocalizedString(@"createReplicator error: %@", nil), error];
            NSLog(@"%@",message);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:message];
        } else {
            if (replicator) {
                CDTSyncPluginDelegate *delegate = [[CDTSyncPluginDelegate alloc] initWithCommandDelegate:self.commandDelegate callbackId:command.callbackId];
                // Must cache delegate for strong reference
                self.delegateMap[[token stringValue]] = delegate;
                self.replicatorMap[[token stringValue]] = replicator;
                self.interceptorMap[[token stringValue]] = interceptor;
                pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
                [pluginResult setKeepCallbackAsBool:YES];
            } else {
                // Replicator factory returned nil
                message = [NSString stringWithFormat:NSLocalizedString(@"createReplicator error: Could not create %@ replicator. CDTReplicatorFactory returned nil", nil), type];
                NSLog(@"%@", message);
                pluginResult = [CDVPluginResult resultWithStatus: CDVCommandStatus_ERROR messageAsString:message];
            }
        }
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];

}

- (void)destroyReplicator:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        NSDictionary *replicatorJSON = [command argumentAtIndex:0];
        NSNumber *token = [replicatorJSON valueForKey:@"token"];
        CDVPluginResult *pluginResult;

        CDTReplicator *replicator = [self.replicatorMap objectForKey:[token stringValue]];
        if (replicator){
            [self.delegateMap removeObjectForKey:[token stringValue]];
            [self.replicatorMap removeObjectForKey:[token stringValue]];
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        } else {
            NSString *message = [NSString stringWithFormat:NSLocalizedString(@"Replicator with token %@ already destroyed", token)];
            NSLog(@"%@",message);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:message];
        }

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

- (void)startReplication:(CDVInvokedUrlCommand*)command
{
    [self.commandDelegate runInBackground:^{
        NSDictionary *replicatorJSON = [command argumentAtIndex:0];
        NSNumber *token = [replicatorJSON valueForKey:@"token"];
        NSError *error = nil;
        CDVPluginResult *pluginResult;

        CDTReplicator *replicator = [self.replicatorMap objectForKey:[token stringValue]];
        if (replicator){
            replicator.delegate = self.delegateMap[[token stringValue]];
            [replicator startWithError:&error];
            if (error){
                // Error occurred, create response
                NSString *message = [NSString stringWithFormat:NSLocalizedString(@"startReplication error: %@", nil), error];
                NSLog(@"%@",message);
                pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:message];
            } else {
                pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
            }
        }else{
            // Error occurred, create response
            NSString *message = [NSString stringWithFormat:NSLocalizedString(@"startReplication error: no defined replicator exists.  Call createReplicator.", nil)];
            NSLog(@"%@",message);
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:message];
        }

        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}
- (void)getReplicationStatus:(CDVInvokedUrlCommand*)command
{
    NSDictionary *replicator = [command argumentAtIndex:0];
    NSNumber *token = [replicator valueForKey:@"token"];
    CDVPluginResult *pluginResult = nil;

    CDTReplicator * rep = [self.replicatorMap objectForKey:[token stringValue]];
    if (rep){
        CDTReplicatorState state = rep.state;
        NSString * message = [self replicatorStateToString:state];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:message];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"The replicator object could not be found"];
    }
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}
- (void)stopReplication:(CDVInvokedUrlCommand*)command
{
    NSDictionary *replicator = [command argumentAtIndex:0];
    NSNumber *token = [replicator valueForKey:@"token"];
    CDVPluginResult *pluginResult = nil;

    CDTReplicator * rep = [self.replicatorMap objectForKey:[token stringValue]];

    if (rep){
        // Android has no boolean return on stop(), so we will mirror Android here to be consistent in hybrid
        [rep stop];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"The replicator object could not be found"];
    }
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (NSString*)replicatorStateToString:(CDTReplicatorState)state {
    NSString *result = nil;
    switch(state) {
        case CDTReplicatorStateComplete:
            result = @"Complete";
            break;
        case CDTReplicatorStateError:
            result = @"Error";
            break;
        case CDTReplicatorStatePending:
            result = @"Pending";
            break;
        case CDTReplicatorStateStarted:
            result = @"Started";
            break;
        case CDTReplicatorStateStopped:
            result = @"Stopped";
            break;
        case CDTReplicatorStateStopping:
            result = @"Stopping";
            break;
        default:
            result = @"Unknown";
            break;
    }
    return result;
}

-(void)unlockInterceptor:(CDVInvokedUrlCommand *)command
{
    NSNumber *token = [command argumentAtIndex:0];
    NSString *type = [command argumentAtIndex:1];
    NSDictionary *httpContext = [command argumentAtIndex:2];
    NSNumber *timeout = [command argumentAtIndex:3];
    NSString *uuid = [command argumentAtIndex:4];

    [self.commandDelegate runInBackground:^{

        CDTSyncPluginInterceptor *interceptor = self.interceptorMap[[token stringValue]];
        if(!interceptor){
            // Error occurred, create response
            NSString *message = [NSString stringWithFormat:NSLocalizedString(@"Cannot unlock interceptor with token %@.  Does not exist", nil), token];
            NSLog(@"%@",message);
            CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:message];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        }else{
            [interceptor updateContext:httpContext uuid:uuid];
            if(timeout){
                // There was a timeout
                NSLog(@"%@ interceptors for replicator with token %@ timed out in the JavaScript layer after %@ ms", type, token, timeout);
            }

            CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
            [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
        }

    }];
}

#pragma mark - JSON to Document Helpers
-(CDTDocumentRevision*) convertJSONToDocument: (NSDictionary*)json error: (NSError**) error
{
    NSString *documentId = json[kCDTDocId];
    NSString *revision = json[kCDTDocRev];
    NSString *deletedString = json[kCDTDocDeleted];
    BOOL deleted = deletedString && [deletedString isEqualToString:@"true"];
    NSDictionary *attachmentsJSON = json[kCDTDocAttachments];

    NSMutableDictionary *body = [NSMutableDictionary dictionary];

    for (NSString *key in json) {
        id value = json[key];
        if( [self isValidJSONType:value] || [NSJSONSerialization isValidJSONObject: value]){
            if(![key isEqualToString:kCDTDocId] && ![key isEqualToString:kCDTDocRev] && ![key isEqualToString:kCDTDocAttachments]){
                body[key] = value;
            }
        }else{
            NSMutableDictionary *userInfo = [NSMutableDictionary dictionary];
            userInfo[NSLocalizedDescriptionKey] = [NSString stringWithFormat: NSLocalizedString(@"Invalid json value found for key%@: %@", nil), key, value];
            *error = [NSError errorWithDomain:@"CDTSyncPlugin" code:42 userInfo:userInfo];
            return nil;
        }
    }

    CDTDocumentRevision *documentRevision = nil;

    NSMutableDictionary *attachments = nil;
    if(attachmentsJSON){
        attachments = [NSMutableDictionary dictionary];
        for (NSString *attachmentName in attachmentsJSON) {
            NSDictionary *attachmentJson = attachmentsJSON[attachmentName];

            NSString *contentType = attachmentJson[kCDTDocAttachmentContentType];

            // Retrieve data and decode it
            NSString *base64Data = attachmentJson[kCDTDocAttachmentData];
            NSData *attachmentData = [[NSData alloc] initWithBase64EncodedString:base64Data options:NSDataBase64DecodingIgnoreUnknownCharacters];

            CDTUnsavedDataAttachment *attachment = [[CDTUnsavedDataAttachment alloc] initWithData:attachmentData name:attachmentName type:contentType];

            // Add the attachment to the attachments dictionary
            attachments[attachmentName]=attachment;
        }

        if(attachments.count <= 0)
            attachments = nil;
    }

        documentRevision = [[CDTDocumentRevision alloc] initWithDocId:documentId revisionId:revision body:body deleted:deleted attachments:attachments sequence:0];

    return documentRevision;
}

-(NSDictionary*) convertDocumentToJSON: (CDTDocumentRevision*)document error: (NSError**) error
{
    NSMutableDictionary *result = [NSMutableDictionary dictionary];
    result[kCDTDocId] = document.docId;
    result[kCDTDocRev] = document.revId;
    if(document.deleted)
        result[kCDTDocDeleted] = [NSNumber numberWithBool:YES];

    for (NSString *key in document.body) {
        result[key] = document.body[key];
    }

    if(document.attachments){
        NSMutableDictionary *attachmentsJSON = [NSMutableDictionary dictionary];
        for(NSString *attachmentName in document.attachments){
            CDTAttachment *attachment = document.attachments[attachmentName];

            NSData *attachmentData = [attachment dataFromAttachmentContent];
            NSString *base64Data = [attachmentData base64EncodedStringWithOptions: 0];

            NSDictionary *attachmentJSON = @{kCDTDocAttachmentContentType : attachment.type, kCDTDocAttachmentData : base64Data};
            attachmentsJSON[attachmentName] = attachmentJSON;
        }

        if(attachmentsJSON.count > 0)
            result[kCDTDocAttachments]=attachmentsJSON;
    }

    return result;
}

-(BOOL) isValidJSONType: (id) value
{
    return [value isKindOfClass:[NSString class]] || [value isKindOfClass: [NSNumber class]] || [value isKindOfClass:[NSNull class]];
}

@end
