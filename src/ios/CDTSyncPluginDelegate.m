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

#import "CDTSyncPluginDelegate.h"
#import <CDTDatastore/CDTReplicator.h>
#import <Cordova/CDVPluginResult.h>

@interface CDTSyncPluginDelegate ()

@property NSObject<CDVCommandDelegate> *commandDelegate;
@property NSString *callbackId;

@end

@implementation CDTSyncPluginDelegate

-(id) initWithCommandDelegate:(NSObject<CDVCommandDelegate> *)delegate callbackId:(NSString *) callbackId
{
    if (self = [super init]){
        if (delegate && callbackId){
            self.commandDelegate = delegate;
            self.callbackId = callbackId;
            return self;
        } else {
            return nil;
        }
    } else {
        return nil;
    }
}

-(void) replicatorDidComplete:(CDTReplicator *)replicator {
    NSArray *result = @[@"complete", [NSNumber numberWithInteger:replicator.changesProcessed]];

    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus: CDVCommandStatus_OK messageAsArray: result];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:self.callbackId];

}

-(void) replicatorDidError:(CDTReplicator *)replicator info:(NSError *)info {
    NSArray *result = @[@"error", [info description]];

    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus: CDVCommandStatus_OK messageAsArray: result];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:self.callbackId];
}

@end
