package com.cloudant.sync.cordova;

import com.cloudant.sync.event.notifications.ReplicationCompleted;
import com.cloudant.sync.event.notifications.ReplicationErrored;
import com.cloudant.sync.event.Subscribe;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;

/**
 * The SyncPluginListener Class proxies replication events to the javascript layer. Each new Replicator is registered with an instance of this class.
 */
public class SyncPluginListener {
    public final CallbackContext context;

    SyncPluginListener(CallbackContext context) {
        this.context = context;
    }

    @Subscribe
    public void complete(ReplicationCompleted event) {
        JSONArray result = new JSONArray();
        result.put("complete");
        result.put(event.documentsReplicated);

        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, result);
        pluginResult.setKeepCallback(true);
        context.sendPluginResult(pluginResult);
    }

    @Subscribe
    public void error(ReplicationErrored error) {
        JSONArray result = new JSONArray();
        result.put("error");
        result.put(error.errorInfo.toString());

        PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, result);
        pluginResult.setKeepCallback(true);
        context.sendPluginResult(pluginResult);
    }
}
