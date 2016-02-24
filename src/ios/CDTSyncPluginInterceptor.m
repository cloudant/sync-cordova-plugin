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

#import "CDTSyncPluginInterceptor.h"

#define REQUEST_KEY @"request"
#define RESPONSE_KEY @"response"

#define HEADERS_KEY @"headers"
#define URL_KEY @"url"
#define STATUS_CODE_KEY @"statusCode"
#define REPLAY_REQUEST_KEY @"replayRequest"
#define LOCK_UUID @"uuid"

@interface CDTSyncPluginInterceptor ()

@property id<CDVCommandDelegate> commandDelegate;
@property NSString *callbackId;

@property NSLock *mapLock;
@property NSMutableDictionary *semaphoreMap;
@property NSMutableDictionary *contextMap;

@end

@implementation CDTSyncPluginInterceptor

-(instancetype)initWithCommandDelegate:(id<CDVCommandDelegate>)delegate callbackId:(NSString *)callbackId
{
    self = [super init];
    if(self){
        _commandDelegate = delegate;
        _callbackId = callbackId;

        _mapLock = [[NSLock alloc]init];
        _semaphoreMap = [NSMutableDictionary dictionary];
        _contextMap = [NSMutableDictionary dictionary];
    }
    return self;
}

-(void)updateContext:(NSDictionary *)httpContext uuid:(NSString*)uuid
{
    // Get cached objects from map
    [self.mapLock lock];

    // Get semaphore to unlock
    dispatch_semaphore_t cachedSemaphore = self.semaphoreMap[uuid];

    if(httpContext){
      // Set httpContext to JavaScript Values
      NSMutableDictionary *cachedHttpContext = self.contextMap[uuid];
      cachedHttpContext[REQUEST_KEY] = httpContext[REQUEST_KEY];
      cachedHttpContext[REPLAY_REQUEST_KEY] = httpContext[REPLAY_REQUEST_KEY];
    }

    // Unlock maps
    [self.mapLock unlock];

    // unlock request or response interceptor methods
    dispatch_semaphore_signal(cachedSemaphore);
}

-(CDTHTTPInterceptorContext*)interceptRequestInContext:(CDTHTTPInterceptorContext *)context
{
    // Create plugin result that will be passed to JavaScript
    NSMutableArray *result = [NSMutableArray array];

    // Indicate this is of type request
    [result addObject:REQUEST_KEY];

    // Build the request JSON
    NSMutableDictionary *requestJSON = [NSMutableDictionary dictionary];
    requestJSON[HEADERS_KEY] = [NSDictionary dictionaryWithDictionary:context.request.allHTTPHeaderFields];
    requestJSON[URL_KEY] = context.request.URL.absoluteString;
    [result addObject:requestJSON];

    // Build the response JSON
    [result addObject:[NSNull null]];

    // Add the replay information
    NSNumber *shouldReplayNumber = [NSNumber numberWithBool:context.shouldRetry];
    [result addObject:shouldReplayNumber];

    // Add the lock uuid to the JavaScript payload
    NSString *uuid = [[NSUUID UUID] UUIDString];
    [result addObject:uuid];

    // Lock and wait for JavaScript to response
    dispatch_semaphore_t jsCallbackSemaphore = dispatch_semaphore_create(0);
    dispatch_time_t timeout = dispatch_time(DISPATCH_TIME_NOW, 60*NSEC_PER_SEC);

    // Cache the lock and context for use in updateContext
    [self.mapLock lock];

    // Cache Semaphore
    self.semaphoreMap[uuid] = jsCallbackSemaphore;

    // Build HTTP Context Cache
    NSMutableDictionary *httpContext = [NSMutableDictionary dictionary];
    httpContext[REQUEST_KEY] = requestJSON;
    httpContext[REPLAY_REQUEST_KEY] = shouldReplayNumber;

    // Cache Context
    self.contextMap[uuid] = httpContext;

    // Unlock maps
    [self.mapLock unlock];


    // Send call back to JavaScript for handling of request
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:result];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:self.callbackId];

    // Block until JavaScript calls back
    dispatch_semaphore_wait(jsCallbackSemaphore, timeout);


    // Get cached objects from map
    [self.mapLock lock];

    // Remove items from cache
    [self.semaphoreMap removeObjectForKey:uuid];

    NSMutableDictionary *cachedHttpContext = self.contextMap[uuid];
    [self.contextMap removeObjectForKey:uuid];

    // Unlock maps
    [self.mapLock unlock];

    // This will be unlocked by the CDTSyncPlugin#unlockInterceptor.
    NSDictionary *cachedRequest = cachedHttpContext[REQUEST_KEY];
    NSDictionary *interceptorHeaders = cachedRequest[HEADERS_KEY];
    if(interceptorHeaders){
        context.request.allHTTPHeaderFields = interceptorHeaders;
    }

    return context;
}

-(CDTHTTPInterceptorContext*)interceptResponseInContext:(CDTHTTPInterceptorContext *)context
{
    // Create plugin result that will be passed to JavaScript
    NSMutableArray *result = [NSMutableArray array];

    // Indicate this is of type request
    [result addObject:RESPONSE_KEY];

    // Build the request JSON
    NSMutableDictionary *requestJSON = [NSMutableDictionary dictionary];
    requestJSON[HEADERS_KEY] = [NSDictionary dictionaryWithDictionary:context.request.allHTTPHeaderFields];
    requestJSON[URL_KEY] = context.request.URL.absoluteString;
    [result addObject:requestJSON];

    // Build the response JSON
    NSMutableDictionary *responseJSON = [NSMutableDictionary dictionary];
    responseJSON[STATUS_CODE_KEY] = [NSNumber numberWithInteger:context.response.statusCode];
    responseJSON[HEADERS_KEY] = [NSDictionary dictionaryWithDictionary:context.response.allHeaderFields];
    [result addObject:responseJSON];

    // Add the replay information
    NSNumber *shouldReplayNumber = [NSNumber numberWithBool:context.shouldRetry];
    [result addObject:shouldReplayNumber];

    // Add the lock uuid to the JavaScript payload
    NSString *uuid = [[NSUUID UUID] UUIDString];
    [result addObject:uuid];

    // Lock and wait for JavaScript to response
    dispatch_semaphore_t jsCallbackSemaphore = dispatch_semaphore_create(0);
    dispatch_time_t timeout = dispatch_time(DISPATCH_TIME_NOW, 60*NSEC_PER_SEC);

    // Cache the lock and context for use in updateContext
    [self.mapLock lock];

    // Cache Semaphore
    self.semaphoreMap[uuid] = jsCallbackSemaphore;

    // Build HTTP Context Cache
    NSMutableDictionary *httpContext = [NSMutableDictionary dictionary];
    httpContext[REQUEST_KEY] = requestJSON;
    httpContext[REPLAY_REQUEST_KEY] = shouldReplayNumber;

    // Cache Context
    self.contextMap[uuid] = httpContext;

    // Unlock maps
    [self.mapLock unlock];

    // Send call back to JavaScript for handling of request
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsArray:result];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:self.callbackId];

    // Lock and wait for JavaScript to response
    dispatch_semaphore_wait(jsCallbackSemaphore, timeout);

    // Get cached objects from map
    [self.mapLock lock];

    // Remove items from cache
    [self.semaphoreMap removeObjectForKey:uuid];

    NSMutableDictionary *cachedHttpContext = self.contextMap[uuid];
    [self.contextMap removeObjectForKey:uuid];

    // Unlock maps
    [self.mapLock unlock];

    // This will be unlocked by the CDTSyncPlugin#unlockInterceptor.
    context.shouldRetry = [cachedHttpContext[REPLAY_REQUEST_KEY] boolValue];

    return context;
}

@end
