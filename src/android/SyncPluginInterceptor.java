package com.cloudant.sync.cordova;

import android.text.TextUtils;
import android.util.Log;

import com.cloudant.http.HttpConnectionInterceptorContext;
import com.cloudant.http.HttpConnectionRequestInterceptor;
import com.cloudant.http.HttpConnectionResponseInterceptor;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

class SyncPluginInterceptor implements HttpConnectionRequestInterceptor, HttpConnectionResponseInterceptor {
    private static final String TAG = SyncPluginInterceptor.class.getCanonicalName();

    static final String URL_KEY = "url";
    static final String RESPONSE_KEY = "response";
    static final String HEADERS_KEY = "headers";
    static final String REQUEST_KEY = "request";
    static final String REPLAY_REQUEST_KEY = "replayRequest";

    public final CallbackContext callbackContext;
    private Map<UUID, CountDownLatch> latchMap;
    private Map<UUID, JSONObject> contextMap;

    public SyncPluginInterceptor(CallbackContext callbackContext) {
        this.callbackContext = callbackContext;
        this.contextMap = Collections.synchronizedMap(new HashMap<UUID, JSONObject>());
        this.latchMap = Collections.synchronizedMap(new HashMap<UUID, CountDownLatch>());
    }

    @Override
    public HttpConnectionInterceptorContext interceptResponse(final HttpConnectionInterceptorContext httpConnectionInterceptorContext) {

        // Build the plugin result that will be passed to the JavaScript
        final JSONObject context = new JSONObject();
        JSONArray result = new JSONArray() {{
            // Indicate that this of type request
            put(RESPONSE_KEY);

            // Build the request JSON
            try {
                JSONObject request = extractRequest(httpConnectionInterceptorContext);
                context.put(REQUEST_KEY, request);
                put(request);
            } catch (JSONException e) {
                Log.e(TAG, "Failed to extract and cache request context", e);
                put(JSONObject.NULL);
            }

            // Build the response JSON
            try {
                JSONObject response = new JSONObject() {{
                    put("statusCode", httpConnectionInterceptorContext.connection.getConnection().getResponseCode());
                    final Iterator<Map.Entry<String, List<String>>> iter = httpConnectionInterceptorContext.connection.getConnection().getHeaderFields().entrySet().iterator();
                    JSONObject headers = new JSONObject() {{
                        while (iter.hasNext()) {
                            Map.Entry<String, List<String>> entry = iter.next();
                            String key = entry.getKey();
                            if (key != null){
                                List<String> list = entry.getValue();
                                String value = TextUtils.join(",", list);
                                put(entry.getKey(), value);
                            }
                        }
                    }};
                    put(HEADERS_KEY, headers);
                }};
                context.put(RESPONSE_KEY, response);
                put(response);
            } catch (Exception e) {
                Log.e(TAG, "Failed to extract response context", e);
                put(JSONObject.NULL);
            }

            // Add the replay information
            try {
                boolean replay = httpConnectionInterceptorContext.replayRequest;
                context.put(REPLAY_REQUEST_KEY, replay);
                put(replay);
            } catch (JSONException e) {
                Log.e(TAG, "Failed to extract and cache replay information", e);
            }
        }};

        // Add the UUID
        UUID id = UUID.randomUUID();
        result.put(id.toString());

        // Cache the lock and context for use in #updateContext
        this.contextMap.put(id, context);
        CountDownLatch responseLatch = new CountDownLatch(1);
        this.latchMap.put(id, responseLatch);

        // Send call back to JavaScript for handling of request
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, result);
        pluginResult.setKeepCallback(true);
        callbackContext.sendPluginResult(pluginResult);

        // Lock and wait for JavaScript to respond
        try {
            responseLatch.await(60, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Log.e(TAG, "Replication interceptor timed out", e);
        }

        // This will be unlocked by the CloudantSyncPlugin#unlockInterceptor. The cached context will have been updated.
        JSONObject updatedContext = this.contextMap.get(id);
        try {
            httpConnectionInterceptorContext.replayRequest = updatedContext.getBoolean(REPLAY_REQUEST_KEY);
        } catch (JSONException e) {
            Log.e(TAG, "Failed to update replay information", e);
        }
        this.contextMap.remove(id);

        return httpConnectionInterceptorContext;
    }

    @Override
    public HttpConnectionInterceptorContext interceptRequest(final HttpConnectionInterceptorContext httpConnectionInterceptorContext) {

        // Build the plugin result that will be passed to the JavaScript
        final JSONObject context = new JSONObject();
        JSONArray result = new JSONArray() {{
            // Indicate that this of type request
            put(REQUEST_KEY);

            // Build the request JSON
            try {
                JSONObject request = extractRequest(httpConnectionInterceptorContext);
                context.put(REQUEST_KEY, request);
                put(request);
            } catch (JSONException e) {
                Log.e(TAG, "Failed to extract and cache request context", e);
                put(JSONObject.NULL);
            }

            // Build the response JSON
            put(JSONObject.NULL);

            // Add the replay information
            try {
                boolean replay = httpConnectionInterceptorContext.replayRequest;
                context.put(REPLAY_REQUEST_KEY, replay);
                put(replay);
            } catch (JSONException e) {
                Log.e(TAG, "Failed to extract and cache replay information", e);
            }
        }};

        // Add the UUID
        UUID id = UUID.randomUUID();
        result.put(id.toString());

        // Cache the lock and context for use in #updateContext
        this.contextMap.put(id, context);
        CountDownLatch requestLatch = new CountDownLatch(1);
        this.latchMap.put(id, requestLatch);

        // Send call back to JavaScript for handling of request
        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, result);
        pluginResult.setKeepCallback(true);
        callbackContext.sendPluginResult(pluginResult);

        // Lock and wait for JavaScript to respond
        try {
            requestLatch.await(60, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Log.e(TAG, "Replication interceptor timed out", e);
        }

        // This will be unlocked by the CloudantSyncPlugin#unlockInterceptor. The cached context will have been updated.
        JSONObject updatedContext = this.contextMap.get(id);
        try {
            JSONObject headers = updatedContext.getJSONObject(REQUEST_KEY).getJSONObject(HEADERS_KEY);
            Iterator<String> iter = headers.keys();
            httpConnectionInterceptorContext.connection.requestProperties.clear();
            while (iter.hasNext()) {
                String key = iter.next();
                httpConnectionInterceptorContext.connection.requestProperties.put(key, headers.getString(key));
            }
        } catch (JSONException e) {
            Log.e(TAG, "Failed to update request headers", e);
        }
        this.contextMap.remove(id);

        return httpConnectionInterceptorContext;
    }

    public void updateContext(String uuid, JSONObject context) {
        UUID id = UUID.fromString(uuid);

        // Get the latch to unlock
        CountDownLatch latch = this.latchMap.remove(id);

        // Set httpContext to Javascript values
        if (context != null) {
            JSONObject interceptorContext = this.contextMap.get(id);
            if (interceptorContext != null) {
                try {
                    JSONObject request = context.getJSONObject(REQUEST_KEY);
                    interceptorContext.put(REQUEST_KEY, request);

                    boolean replay = context.getBoolean(REPLAY_REQUEST_KEY);
                    interceptorContext.put(REPLAY_REQUEST_KEY, replay);
                } catch (JSONException e) {
                    Log.e(TAG, "Failed to update HTTP interceptor context", e);
                }
            } else {
                Log.e(TAG, "Failed to update HTTP interceptor context. HTTPInterceptorContext " + uuid + " does not exist.");
            }
        }

        // Unlock request or response interceptor methods
        if (latch != null) {
            latch.countDown();
        } else {
            Log.e(TAG, "Failed to unlock interceptor. Latch " + id.toString() + " does not exist.");
        }
    }

    private JSONObject extractRequest(final HttpConnectionInterceptorContext httpContext) throws JSONException {

        return new JSONObject() {{
            JSONObject headers = new JSONObject(httpContext.connection.requestProperties);
            put(HEADERS_KEY, headers);
            put(URL_KEY, httpContext.connection.url.toString());
        }};
    }
}
