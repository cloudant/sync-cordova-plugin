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

#import <UIKit/UIKit.h>
#import <Cordova/CDVPlugin.h>

@interface CDTSyncPlugin : CDVPlugin

-(void)openDatastore:(CDVInvokedUrlCommand*)command;

-(void)deleteDatastore:(CDVInvokedUrlCommand*)command;

-(void)createOrUpdateDocumentFromRevision:(CDVInvokedUrlCommand*)command;

-(void)getDocument:(CDVInvokedUrlCommand*)command;

-(void)deleteDocumentFromRevision:(CDVInvokedUrlCommand*)command;

-(void)ensureIndexed:(CDVInvokedUrlCommand*)command;

-(void)deleteIndexNamed:(CDVInvokedUrlCommand*)command;

-(void)find:(CDVInvokedUrlCommand*)command;

-(void)createReplicator:(CDVInvokedUrlCommand*)command;

-(void)destroyReplicator:(CDVInvokedUrlCommand*)command;

-(void)startReplication:(CDVInvokedUrlCommand*)command;

-(void)stopReplication:(CDVInvokedUrlCommand*)command;

-(void)getReplicationStatus:(CDVInvokedUrlCommand*)command;

-(void)unlockInterceptor:(CDVInvokedUrlCommand*)command;

-(void)createDatastoreManager:(CDVInvokedUrlCommand*)command;

-(void)getConflictedDocumentIds:(CDVInvokedUrlCommand*)command;

-(void)resolveConflictsForDocument:(CDVInvokedUrlCommand*)command;

-(void)returnResolvedDocument:(CDVInvokedUrlCommand*)command;

+(CDTDocumentRevision*) convertJSONToDocument: (NSDictionary*)json error: (NSError**) error;
+(NSDictionary*) convertDocumentToJSON: (CDTDocumentRevision*)document error: (NSError**) error;
@end
