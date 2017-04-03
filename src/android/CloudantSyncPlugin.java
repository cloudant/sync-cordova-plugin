/*
 * Copyright (c) 2015-2017 IBM Corp. All rights reserved.
 * <p>
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of the License at
 * <p>
 * http://www.apache.org/licenses/LICENSE-2.0
 * <p>
 * Unless required by applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 */

package com.cloudant.sync.cordova;

import android.content.Context;
import android.util.Base64;
import android.util.Log;

import com.cloudant.http.HttpConnectionRequestInterceptor;
import com.cloudant.http.HttpConnectionResponseInterceptor;
import com.cloudant.sync.documentstore.Attachment;
import com.cloudant.sync.documentstore.ConflictResolver;
import com.cloudant.sync.documentstore.DocumentStore;
import com.cloudant.sync.documentstore.DocumentBody;
import com.cloudant.sync.documentstore.DocumentBodyFactory;
import com.cloudant.sync.documentstore.DocumentRevision;
import com.cloudant.sync.documentstore.UnsavedStreamAttachment;
import com.cloudant.sync.documentstore.encryption.KeyProvider;
import com.cloudant.sync.query.FieldSort;
import com.cloudant.sync.query.Query;
import com.cloudant.sync.query.QueryResult;
import com.cloudant.sync.replication.Replicator;
import com.cloudant.sync.replication.ReplicatorBuilder;

import org.apache.commons.io.IOUtils;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

public class CloudantSyncPlugin extends CordovaPlugin {
    private static final String TAG = CloudantSyncPlugin.class.getCanonicalName();

    private static final String ACTION_SET_DOCUMENT_STORE_PATH = "createDatastoreManager";
    private static final String ACTION_OPEN_DOCUMENT_STORE = "openDatastore";
    private static final String ACTION_CLOSE_DOCUMENT_STORE = "closeDatastore";
    private static final String ACTION_DELETE_DOCUMENT_STORE = "deleteDatastore";
    private static final String ACTION_CREATE_OR_UPDATE_DOCUMENT_FROM_REVISION = "createOrUpdateDocumentFromRevision";
    private static final String ACTION_GET_DOCUMENT = "getDocument";
    private static final String ACTION_DELETE_DOCUMENT_FROM_REVISION = "deleteDocumentFromRevision";
    private static final String ACTION_ENSURE_INDEXED = "ensureIndexed";
    private static final String ACTION_DELETE_INDEX_NAMED = "deleteIndexNamed";
    private static final String ACTION_FIND = "find";
    private static final String ACTION_CREATE_REPLICATOR = "createReplicator";
    private static final String ACTION_DESTROY_REPLICATOR = "destroyReplicator";
    private static final String ACTION_START_REPLICATION = "startReplication";
    private static final String ACTION_STOP_REPLICATION = "stopReplication";
    private static final String ACTION_GET_REPLICATION_STATUS = "getReplicationStatus";
    private static final String ACTION_UNLOCK_INTERCEPTOR = "unlockInterceptor";
    private static final String ACTION_GET_CONFLICTED_DOCUMENT_IDS = "getConflictedDocumentIds";
    private static final String ACTION_RESOLVE_CONFLICTS_FOR_DOCUMENT = "resolveConflictsForDocument";
    private static final String ACTION_RETURN_RESOLVED_DOCUMENT = "returnResolvedDocument";

    private static final String DOCUMENT_STORE_NAME = "name";

    private static final String DOC_ID = "_id";
    private static final String DOC_REV = "_rev";
    private static final String DOC_DELETED = "_deleted";
    private static final String DOC_ATTACHMENTS = "_attachments";
    private static final String DOC_ATTACHMENTS_CONTENT_TYPE = "content_type";
    private static final String DOC_ATTACHMENTS_DATA = "data";

    private static final String REPLICATOR_TOKEN = "token";
    private static final String REPLICATOR_DOCUMENT_STORE = "datastore";
    private static final String REPLICATOR_URI = "uri";
    private static final String REPLICATOR_TYPE = "type";

    private static final String SQLITEDATABASE_CANONICAL_NAME = "net.sqlcipher.database.SQLiteDatabase";
    private static final String SQLITEDATABASE_LOADLIBS_METHOD_NAME = "loadLibs";

    private static final String DEFAULT_DOCUMENT_STORE_DIR_NAME = "CloudantSync";


    private static Map<String, DocumentStore> documentStores = Collections.synchronizedMap(new HashMap<String,
        DocumentStore>());
    private static Map<String, Query> queries = Collections.synchronizedMap(new
        HashMap<String, Query>());
    private static Map<Integer, Replicator> replicators = Collections.synchronizedMap(new HashMap<Integer, Replicator>());
    private static Map<Integer, SyncPluginInterceptor> interceptors = Collections.synchronizedMap(new HashMap<Integer, SyncPluginInterceptor>());
    private static Map<String, Map<String, KeyProvider>> keyProviders = Collections.synchronizedMap(new HashMap<String, Map<String, KeyProvider>>());
    private static Map<Integer, String> documentStorePaths = Collections.synchronizedMap(new HashMap<Integer,String>());
    private static Map<String, ConflictResolverWrapper> resolverMap = Collections.synchronizedMap(new HashMap<String, ConflictResolverWrapper>());

    private class ConflictResolverWrapper implements ConflictResolver {

       private CallbackContext callbackContext;
       private DocumentRevision documentRevision;
       private boolean conflictResolutionComplete;

       ConflictResolverWrapper(CallbackContext callbackContext) {
          this.callbackContext = callbackContext;
       }

       void setRevision(DocumentRevision revision) {
          synchronized(this) {
             documentRevision = revision;
             conflictResolutionComplete = true;
             this.notifyAll();
          }
       }

       public DocumentRevision resolve (String docId, List<? extends DocumentRevision> conflicts) {
          try {
             JSONArray jsonConflicts = new JSONArray();
             for (DocumentRevision docRev : conflicts) {
                jsonConflicts.put(buildJSON(docRev, false));
             }

             JSONObject jsonObject = new JSONObject();
             jsonObject.put("docId", docId);
             jsonObject.put("conflicts", jsonConflicts);
             jsonObject.put("resolverId", callbackContext.getCallbackId());

             // Send the conflicts back to the javascript so that the conflicts can
             // be resolved in the javascript callback. Keep the callback alive
             // so we can also notify the caller of the end of conflict resolution.
             PluginResult r = new PluginResult(PluginResult.Status.OK, jsonObject);
             r.setKeepCallback(true);
             callbackContext.sendPluginResult(r);

             // Wait for the javascript to call us back with the result of the
             // conflict resolution.
             try {
                synchronized(this) {
                   while(!this.conflictResolutionComplete) {
                      this.wait();
                   }
                }
             } catch (InterruptedException e) {
                Log.e(TAG, "Interrupted while waiting for callback during conflict resolution for: " + docId, e);
                return null;
             }

             // Update the document with the revised info we got back from the javascript.
             if (this.documentRevision != null) {
                for (DocumentRevision docRev : conflicts) {
                   if (docRev.getRevision().equals(this.documentRevision.getRevision())) {
                      docRev.setBody(this.documentRevision.getBody());
                      docRev.setAttachments(this.documentRevision.getAttachments());
                      return docRev;
                   }
                }
                Log.e(TAG, "Unable to find revision matching " + this.documentRevision.getRevision() +
                      " in conflicts for: " + docId);
             }
             return this.documentRevision;
          } catch (JSONException e) {
             Log.e(TAG, "JSONException occurred while attempting to resolve conflicts for: " + docId, e);
          } catch (IOException e) {
             Log.e(TAG, "IOException occurred while attempting to resolve conflicts for: " + docId, e);
          }
          return null;
       }
    }

    /**
     * Executes the request and returns PluginResult.
     *
     * @param action          The action to execute.
     * @param args            JSONArray of arguments for the plugin.
     * @param callbackContext The callback id used when calling back into JavaScript.
     * @return True if the action was valid, false if not.
     */
    public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException {
        if (ACTION_SET_DOCUMENT_STORE_PATH.equals(action)) {
            setDocumentStorePath(args,callbackContext);
        } else if (ACTION_OPEN_DOCUMENT_STORE.equals(action)) {
            final int documentStorePathId = args.getInt(0);
            final String documentStoreName = JSONObject.NULL.equals(args.get(1)) ? null : args
                .getString(1);

            openDocumentStore(documentStorePathId, documentStoreName, callbackContext);

        } else if (ACTION_CLOSE_DOCUMENT_STORE.equals(action)) {
            closeDocumentStore(args, callbackContext);
        } else if (ACTION_DELETE_DOCUMENT_STORE.equals(action)) {
            final String name = JSONObject.NULL.equals(args.get(1)) ? null : args.getString(1);

            deleteDocumentStore(name, callbackContext);

        } else if (ACTION_CREATE_OR_UPDATE_DOCUMENT_FROM_REVISION.equals(action)) {
            final String documentStoreName = JSONObject.NULL.equals(args.get(0)) ? null : args.getString(0);
            final JSONObject docRev = JSONObject.NULL.equals(args.get(1)) ? null : args.getJSONObject(1);
            final boolean isCreate = JSONObject.NULL.equals(args.get(2)) ? null : args.getBoolean(2);

            createOrUpdateDocumentFromRevision(documentStoreName, docRev, callbackContext, isCreate);

        } else if (ACTION_GET_DOCUMENT.equals(action)) {
            final String documentStoreName = JSONObject.NULL.equals(args.get(0)) ? null : args
                .getString(0);
            final String docId = JSONObject.NULL.equals(args.get(1)) ? null : args.getString(1);

            getDocument(documentStoreName, docId, callbackContext);

        } else if (ACTION_DELETE_DOCUMENT_FROM_REVISION.equals(action)) {
            final String documentStoreName = JSONObject.NULL.equals(args.get(0)) ? null : args.getString(0);
            final JSONObject docRev = JSONObject.NULL.equals(args.get(1)) ? null : args.getJSONObject(1);

            deleteDocumentFromRevision(documentStoreName, docRev, callbackContext);

        } else if (ACTION_ENSURE_INDEXED.equals(action)) {
            final String documentStoreName = JSONObject.NULL.equals(args.get(0)) ? null : args.getString(0);
            final String indexName = JSONObject.NULL.equals(args.get(1)) ? null : args.getString(1);
            final JSONArray fields = JSONObject.NULL.equals(args.get(2)) ? null : args.getJSONArray(2);

            ensureIndexed(documentStoreName, fields, indexName, callbackContext);

        } else if (ACTION_DELETE_INDEX_NAMED.equals(action)) {
            final String documentStoreName = JSONObject.NULL.equals(args.get(0)) ? null : args.getString(0);
            final String indexName = JSONObject.NULL.equals(args.get(1)) ? null : args.getString(1);

            deleteIndexNamed(documentStoreName, indexName, callbackContext);

        } else if (ACTION_FIND.equals(action)) {
            final String documentStoreName = JSONObject.NULL.equals(args.get(0)) ? null : args.getString(0);
            final JSONObject query = JSONObject.NULL.equals(args.get(1)) ? null : args.getJSONObject(1);

            find(documentStoreName, query, callbackContext);

        } else if (ACTION_CREATE_REPLICATOR.equals(action)) {
            final JSONObject replicatorJson = JSONObject.NULL.equals(args.get(0)) ? new JSONObject() : args.getJSONObject(0);
            final JSONObject documentStore = JSONObject.NULL.equals(replicatorJson.get(REPLICATOR_DOCUMENT_STORE)) ? new JSONObject() : replicatorJson.getJSONObject(REPLICATOR_DOCUMENT_STORE);
            final String documentStoreName = JSONObject.NULL.equals(documentStore.get(DOCUMENT_STORE_NAME)) ? null : documentStore.getString(DOCUMENT_STORE_NAME);
            final String remoteUrl = JSONObject.NULL.equals(replicatorJson.get(REPLICATOR_URI)) ? null : replicatorJson.getString(REPLICATOR_URI);
            final String type = JSONObject.NULL.equals(replicatorJson.get(REPLICATOR_TYPE)) ? null : replicatorJson.getString(REPLICATOR_TYPE);
            final Integer timestamp = JSONObject.NULL.equals(replicatorJson.get(REPLICATOR_TOKEN)) ? null : replicatorJson.getInt(REPLICATOR_TOKEN);

            createReplicator(documentStoreName, remoteUrl, type, timestamp, callbackContext);

        } else if (ACTION_DESTROY_REPLICATOR.equals(action)) {
            final JSONObject replicatorJson = JSONObject.NULL.equals(args.get(0)) ? new JSONObject() : args.getJSONObject(0);
            final Integer token = JSONObject.NULL.equals(replicatorJson.get(REPLICATOR_TOKEN)) ? null : replicatorJson.getInt(REPLICATOR_TOKEN);

            destroyReplicator(token, callbackContext);

        } else if (ACTION_START_REPLICATION.equals(action)) {
            final JSONObject replicatorJson = JSONObject.NULL.equals(args.get(0)) ? new JSONObject() : args.getJSONObject(0);
            final Integer token = JSONObject.NULL.equals(replicatorJson.get(REPLICATOR_TOKEN)) ? null : replicatorJson.getInt(REPLICATOR_TOKEN);

            startReplication(token, callbackContext);

        } else if (ACTION_GET_REPLICATION_STATUS.equals(action)) {
            final JSONObject replicatorJson = JSONObject.NULL.equals(args.get(0)) ? new JSONObject() : args.getJSONObject(0);
            final Integer token = JSONObject.NULL.equals(replicatorJson.get(REPLICATOR_TOKEN)) ? null : replicatorJson.getInt(REPLICATOR_TOKEN);

            getReplicationStatus(token, callbackContext);

        } else if (ACTION_STOP_REPLICATION.equals(action)) {
            final JSONObject replicatorJson = JSONObject.NULL.equals(args.get(0)) ? new JSONObject() : args.getJSONObject(0);
            final Integer token = JSONObject.NULL.equals(replicatorJson.get(REPLICATOR_TOKEN)) ? null : replicatorJson.getInt(REPLICATOR_TOKEN);

            stopReplication(token, callbackContext);

        } else if (ACTION_UNLOCK_INTERCEPTOR.equals(action)) {
            final Integer token = JSONObject.NULL.equals(args.get(0)) ? null : args.getInt(0);
            final String type = JSONObject.NULL.equals(args.get(1)) ? null : args.getString(1);
            final JSONObject httpContext = JSONObject.NULL.equals(args.get(2)) ? null : args.getJSONObject(2);
            final Integer timeout = JSONObject.NULL.equals(args.get(3)) ? null : args.getInt(3);
            final String uuid = JSONObject.NULL.equals(args.get(4)) ? null : args.getString(4);

            unlockInterceptor(token, type, httpContext, timeout, uuid, callbackContext);
        } else if (ACTION_GET_CONFLICTED_DOCUMENT_IDS.equals(action)) {
            final String documentStoreName = JSONObject.NULL.equals(args.get(0)) ? null : args.getString(0);

            getConflictedDocumentIds(documentStoreName, callbackContext);
        } else if (ACTION_RESOLVE_CONFLICTS_FOR_DOCUMENT.equals(action)) {
            final String documentStoreName = JSONObject.NULL.equals(args.get(0)) ? null : args.getString(0);
            final String documentId = JSONObject.NULL.equals(args.get(1)) ? null : args.getString(1);

            resolveConflictsForDocument(documentStoreName, documentId, callbackContext);
        } else if (ACTION_RETURN_RESOLVED_DOCUMENT.equals(action)) {
            final JSONObject docRev = JSONObject.NULL.equals(args.get(0)) ? null : args.getJSONObject(0);
            final String resolverId = JSONObject.NULL.equals(args.get(1)) ? null : args.getString(1);

            returnResolvedDocument(docRev, resolverId, callbackContext);
        } else {
            return false;
        }
        return true;
    }


    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////// JavaScript - Java mapped methods ////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////


    private void setDocumentStorePath(JSONArray args, final CallbackContext callbackContext) throws JSONException {
        final String path;
        if(JSONObject.NULL.equals(args.get(0))){
            Context context = cordova.getActivity().getApplicationContext();
            File fp = context.getDir(DEFAULT_DOCUMENT_STORE_DIR_NAME, Context.MODE_PRIVATE);
            path = fp.getAbsolutePath();
        } else {
            path = args.getString(0);
        }

        cordova.getThreadPool().execute(new Runnable (){
            @Override
            public void run(){
                int id = documentStorePaths.size();
                // Auto-boxing id.
                documentStorePaths.put(id, path);
                JSONObject response = new JSONObject();
                try {
                    response.put("id",id); }
                catch (JSONException e){
                    // This should never happen, terminate
                    throw new RuntimeException(e);
                }
                callbackContext.success(response);
            }
        });
    }


    /**
     * Opens a DocumentStore with the specified name
     * @param documentStoreName - The name of the DocumentStore to open
     * @param callbackContext - The javascript callback to execute when complete or errored
     */
    private void openDocumentStore(final int documentStorePathId, final String documentStoreName,
                                   final
    CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    String path = documentStorePaths.get(documentStorePathId);
                    DocumentStore ds = DocumentStore.getInstance(new File(path, documentStoreName));
                    documentStores.put(documentStoreName, ds);
                    JSONObject r = new JSONObject();
                    r.put("name", documentStoreName);
                    callbackContext.success(r);
                } catch (Exception e) {
                    callbackContext.error(e.getMessage());
                }
            }
        });
    }

    private void closeDocumentStore(final JSONArray args, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable(){
            @Override
            public void run() {
                try{
                    DocumentStore ds = documentStores.remove(args.getString(0));
                    if(ds == null){
                        callbackContext.error("DocumentStore is not open");
                        return;
                    }

                    ds.close();
                    callbackContext.success();
                } catch (Exception e){
                    callbackContext.error("DocumentStore could not be closed");
                }
            }
        });
    }

    /**
     * Deletes a DocumentStore with the specified name
     * @param documentStoreName - The name of the document store to delete
     * @param callbackContext - The javascript callback to execute when complete or errored
     */
    private void deleteDocumentStore(final String documentStoreName,
                                  final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                if (documentStoreName == null) {
                    callbackContext.error("DocumentStore name cannot be null");
                } else {

                    // Clear from cache
                    try {
                        DocumentStore ds = getDocumentStore(documentStoreName);
                        ds.delete();
                    } catch (Exception e) {
                        Log.e(TAG, "Error deleting from disk DocumentStore: " + documentStoreName, e);
                    }

                    documentStores.remove(documentStoreName);
                    queries.remove(documentStoreName);

                    callbackContext.success();
                }
            }
        });
    }

    /**
     * Creates or updates a document from a given revision
     * @param documentStoreName - The name of the DocumentStore
     * @param docRev - The JSON document revision to save
     * @param callbackContext - The javascript callback to execute when complete or errored
     * @param isCreate - if true, indicates we are creating a document and if false, indicates
     *        we are updating a document.
     */
    private void createOrUpdateDocumentFromRevision(final String documentStoreName, final JSONObject docRev, final CallbackContext callbackContext, final boolean isCreate) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    DocumentStore ds = getDocumentStore(documentStoreName);
                    DocumentRevision rev = buildDocRevision(docRev);

                    DocumentRevision result;

                    if (isCreate) {
                        result = ds.database().create(rev);
                    } else {
                        result = ds.database().update(rev);
                    }
                    JSONObject r = buildJSON(result, isCreate);
                    callbackContext.success(r);
                } catch (Exception e) {
                    callbackContext.error(e.getMessage());
                }
            }
        });
    }

    /**
     * Fetches a document revision
     * @param documentStoreName - The name of the DocumentStore
     * @param docId - The ID of the document to fetch
     * @param callbackContext - The javascript callback to execute when complete or errored
     */
    private void getDocument(final String documentStoreName, final String docId, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    DocumentStore ds = getDocumentStore(documentStoreName);
                    DocumentRevision result = ds.database().read(docId);
                    JSONObject r = buildJSON(result, false);
                    callbackContext.success(r);
                } catch (Exception e) {
                    callbackContext.error(e.getMessage());
                }
            }
        });
    }

    /**
     * Deletes a document revision
     * @param documentStoreName - The name of the DocumentStore
     * @param docRev - The ID of the document to delete
     * @param callbackContext - The javascript callback to execute when complete or errored
     */
    private void deleteDocumentFromRevision(final String documentStoreName, final JSONObject docRev, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    DocumentStore ds = getDocumentStore(documentStoreName);
                    DocumentRevision rev = buildDocRevision(docRev);

                    DocumentRevision deletedRevision = ds.database().delete(rev);
                    callbackContext.success(buildJSON(deletedRevision, false));
                } catch (Exception e) {
                    callbackContext.error(e.getMessage());
                }
            }
        });
    }

    /**
     * Adds a single, possibly compound, index for the given field names
     * @param documentStoreName - The name of the DocumentStore
     * @param fields - The list of fields to index
     * @param indexName - The name of the index
     * @param callbackContext - The javascript callback to execute when complete or errored
     */
    private void ensureIndexed(final String documentStoreName, final JSONArray fields, final String indexName, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    if (indexName == null || fields == null) {
                        throw new Exception("indexName and fields cannot be null");
                    }

                    List<FieldSort> indexFields = new ArrayList<FieldSort>();
                    for (int i = 0; i < fields.length(); i++) {
                        indexFields.add(new FieldSort((String)fields.get(i)));
                    }

                    DocumentStore ds = getDocumentStore(documentStoreName);
                    ds.query().createJsonIndex(indexFields, indexName);
                    callbackContext.success(indexName);
                } catch (Exception e) {
                    callbackContext.error(e.getMessage());
                }
            }
        });
    }

    /**
     * Deletes an index
     * @param documentStoreName - The name of the DocumentStore
     * @param indexName - The name of the index to delete
     * @param callbackContext - The javascript callback to execute when complete or errored
     */
    private void deleteIndexNamed(final String documentStoreName, final String indexName, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    if (indexName == null) {
                        throw new Exception("indexName cannot be null");
                    }

                    DocumentStore ds = getDocumentStore(documentStoreName);
                    ds.query().deleteIndex(indexName);
                    PluginResult r = new PluginResult(PluginResult.Status.OK, true);
                    callbackContext.sendPluginResult(r);
                } catch (Exception e) {
                    callbackContext.error(e.getMessage());
                }
            }
        });
    }

    /**
     * Queries the DocumentStore
     * @param documentStoreName - The name of the DocumentStore
     * @param query - The Cloudant Query to execute
     * @param callbackContext - The javascript callback to execute when complete or errored
     */
    private void find(final String documentStoreName, final JSONObject query, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    if (query == null) {
                        throw new Exception("query object cannot be null");
                    }

                    CloudantQuery q = new CloudantQuery(convertJSONtoMap(query));
                    DocumentStore ds = getDocumentStore(documentStoreName);
                    List<FieldSort> sortSpec = null;
                    if (q.getSort() != null) {
                        sortSpec = new ArrayList<FieldSort>();
                        for (Map<String, String> sortMap : q.getSort()) {
                            for (Map.Entry<String, String> entry : sortMap.entrySet()) {
                                FieldSort.Direction direction;
                                if ("asc".equals(entry.getValue())) {
                                    direction = FieldSort.Direction.ASCENDING;
                                } else if ("desc".equals(entry.getValue())) {
                                    direction = FieldSort.Direction.DESCENDING;
                                } else {
                                    throw new Exception("Sort direction must be either \"asc\" or " +
                                        "\"desc\". Got: " + entry.getValue());
                                }
                                sortSpec.add(new FieldSort(entry.getKey(), direction));
                            }
                        }
                    }
                    QueryResult qr = ds.query().find(q.getSelector(), q.getSkip(), q.getLimit(), q
                        .getFields(), sortSpec);

                    JSONArray r = new JSONArray();
                    if (qr != null) {
                        for (DocumentRevision rev : qr) {
                            JSONObject jsonDoc = buildJSON(rev, false);
                            r.put(jsonDoc);
                        }
                    }
                    callbackContext.success(r);
                } catch (Exception e) {
                    callbackContext.error(e.getMessage());
                }
            }
        });
    }

    /**
     * Creates a new Replicator
     * @param documentStoreName - The name of the DocumentStore
     * @param remoteURI - The remote database URI
     * @param type - The type of replication to be performed
     * @param token - The unique token id of the Replicator
     * @param callbackContext - The javascript callback to execute when complete or errored
     */
    private void createReplicator(final String documentStoreName, final String remoteURI, final String type, final Integer token, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    DocumentStore ds = getDocumentStore(documentStoreName);

                    if (remoteURI == null || type == null || token == null) {
                        throw new Exception("Replicator uri, type, and token must not be null");
                    }

                    URI uri;
                    try {
                        uri = new URI(remoteURI);
                    } catch (URISyntaxException e) {
                        throw new Exception("Invalid uri: " + remoteURI);
                    }

                    Replicator replicator;
                    final SyncPluginInterceptor interceptor = new SyncPluginInterceptor(callbackContext);
                    if (type.equals("push")) {
                        replicator = ReplicatorBuilder.push()
                                .to(uri)
                                .from(ds)
                                .addRequestInterceptors((HttpConnectionRequestInterceptor) interceptor)
                                .addResponseInterceptors((HttpConnectionResponseInterceptor) interceptor)
                                .build();
                    } else if (type.equals("pull")) {
                        replicator = ReplicatorBuilder.pull()
                                .from(uri)
                                .to(ds)
                                .addRequestInterceptors((HttpConnectionRequestInterceptor) interceptor)
                                .addResponseInterceptors((HttpConnectionResponseInterceptor) interceptor)
                                .build();
                    } else {
                        throw new Exception("Replicator 'type' must be either 'push' or 'pull'. Received: " + type);
                    }

                    if (replicator == null) {
                        throw new Exception("Failed to create " + type + " Replicator. Builder returned null");
                    }

                    replicator.getEventBus().register(new SyncPluginListener(callbackContext));

                    replicators.put(token, replicator);
                    interceptors.put(token, interceptor);

                    PluginResult pluginResult = new PluginResult(PluginResult.Status.OK);
                    pluginResult.setKeepCallback(true);
                    callbackContext.sendPluginResult(pluginResult);

                } catch (Exception e) {
                    callbackContext.error(e.getMessage());
                }
            }
        });
    }

    /**
     * Removes a Replicator from the replicators cache
     * @param token - The unique token id of the Replicator
     * @param callbackContext - The javascript callback to execute when complete or errored
     */
    private void destroyReplicator(final Integer token, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                Replicator replicator = replicators.remove(token);
                interceptors.remove(token);

                if (replicator != null) {
                    callbackContext.success();
                } else {
                    callbackContext.error("Replicator with token " + token + " already destroyed.");
                }
            }
        });
    }

    /**
     * Starts replication
     * @param token - The unique token id of the Replicator
     * @param callbackContext - The javascript callback to execute when complete or errored
     */
    private void startReplication(final Integer token, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                Replicator replicator = replicators.get(token);

                if (replicator == null) {
                    callbackContext.error("Cannot start replicator with timestamp: " + token + ". Does not exist.");
                } else {
                    replicator.start();
                    callbackContext.success();
                }
            }
        });
    }

    /**
     * Gets current replication state
     * @param token - The unique token id of the Replicator
     * @param callbackContext - The javascript callback to execute when complete or errored
     */
    private void getReplicationStatus(final Integer token, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                Replicator replicator = replicators.get(token);

                if (replicator == null) {
                    callbackContext.error("Cannot get status for replicator with timestamp: " + token + ". Does not exist.");
                } else {
                    callbackContext.success(convertReplicationStateToString(replicator.getState()));
                }
            }
        });
    }

    /**
     * Stops replication
     * @param token - The unique token id of the Replicator
     * @param callbackContext - The javascript callback to execute when complete or errored
     */
    private void stopReplication(final Integer token, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                Replicator replicator = replicators.get(token);

                if (replicator == null) {
                    callbackContext.error("Cannot stop replicator with token: " + token + ". Does not exist.");
                } else {
                    replicator.stop();
                    callbackContext.success(convertReplicationStateToString(Replicator.State.STOPPING));
                }
            }
        });
    }

    private void unlockInterceptor(final Integer token, final String type, final JSONObject httpContext, final Integer timeout, final String uuid, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                SyncPluginInterceptor interceptor = interceptors.get(token);

                if (interceptor == null) {
                    callbackContext.error("Cannot unlock interceptor with token: " + token + ". Does not exist.");
                } else {
                    if (timeout != null) {
                        Log.e(TAG, type + " interceptors for replicator with token " + token + " timed out in the JavaScript layer after " + timeout + "ms.");
                    }

                    interceptor.updateContext(uuid, httpContext);

                    callbackContext.success();
                }
            }
        });
    }

    /**
     * Gets the IDs of documents with conflicts
     * @param documentStoreName - The name of the DocumentStore
     * @param callbackContext - The javascript callback to execute when complete or errored
     */
    private void getConflictedDocumentIds(final String documentStoreName, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    DocumentStore ds = getDocumentStore(documentStoreName);

                    Iterable<String> conflicts = ds.database().getConflictedIds();

                    JSONArray r = new JSONArray();
                    for (String id : conflicts) {
                       r.put(id);
                    }
                    callbackContext.success(r);
                } catch (Exception e) {
                    callbackContext.error(e.getMessage());
                }
            }
        });
    }

    private void resolveConflictsForDocument(final String documentStoreName, final String documentId, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    DocumentStore ds = getDocumentStore(documentStoreName);

                    ConflictResolverWrapper conflictResolver = new ConflictResolverWrapper(callbackContext);

                    // Store the conflictResolver in a map indexed by a unique ID that can be passed around
                    // to retrieve the conflictResolver from other callbacks. The callbackId is unique
                    // to each invocation of this method so we'll use that.
                    resolverMap.put(callbackContext.getCallbackId(), conflictResolver);
                    ds.database().resolveConflicts(documentId, conflictResolver);
                    PluginResult r = new PluginResult(PluginResult.Status.OK);
                    callbackContext.sendPluginResult(r);

                } catch (Exception e) {
                    callbackContext.error(e.getMessage());
                }
            }
        });
    }

    private void returnResolvedDocument(final JSONObject docRev, final String resolverId, final CallbackContext callbackContext) {
        cordova.getThreadPool().execute(new Runnable() {
            @Override
            public void run() {
                try {
                    ConflictResolverWrapper conflictResolver = resolverMap.remove(resolverId);
                    DocumentRevision revision = docRev == null ? null : buildDocRevision(docRev);
                    conflictResolver.setRevision(revision);

                    PluginResult r = new PluginResult(PluginResult.Status.OK);
                    callbackContext.sendPluginResult(r);
                } catch (Exception e) {
                    callbackContext.error(e.getMessage());
                }
            }
        });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////// Internal utility methods ////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @param name - The DocumentStore name
     * @return - The DocumentStore object stored in the documentStores Map
     * @throws Exception - If no DocumentStore value is associated with key 'name'
     */
    private DocumentStore getDocumentStore(String name) throws Exception {
        if (name == null) {
            throw new Exception("Name cannot be null");
        }

        DocumentStore store = documentStores.get(name);

        if (store == null) {
            throw new Exception("No DocumentStore found with name: " + name);
        }

        return store;
    }

    /**
     * @param obj - The JSONObject to transform
     * @return - The Map from the converted JSONObject
     * @throws JSONException
     */
    private Map<String, Object> getMapFromJSONObject(JSONObject obj) throws JSONException {
        Map<String, Object> newMap = new HashMap<String, Object>();

        Iterator<String> iter = obj.keys();

        while (iter.hasNext()) {
            String key = iter.next();
            if (!key.equals(DOC_ID) && !key.equals(DOC_REV) && !key.equals(DOC_DELETED)) {
                newMap.put(key, obj.get(key));
            }
        }

        return newMap;
    }

    /**
     * @param docRevisionJSON - The JSONObject to transform
     * @return - The DocumentRevision from the converted JSONObject
     * @throws Exception
     */
    private DocumentRevision buildDocRevision(JSONObject docRevisionJSON) throws Exception {
        if (docRevisionJSON == null) throw new Exception("Document revision cannot be null");

        String docId = null;
        String docRev = null;
        DocumentBody body;

        if (docRevisionJSON.has(DOC_ID)) {
            docId = (String) docRevisionJSON.get(DOC_ID);
        }

        if (docRevisionJSON.has(DOC_REV)) {
            docRev = (String) docRevisionJSON.get(DOC_REV);
        }

        DocumentRevision revision = new DocumentRevision(docId, docRev);

        if (docRevisionJSON.has(DOC_DELETED) && docRevisionJSON.getBoolean(DOC_DELETED)) {
            revision.setDeleted();
        }

        Map<String, Attachment> attachmentMap = null;
        if (docRevisionJSON.has(DOC_ATTACHMENTS)) {

            JSONObject attachments = docRevisionJSON.getJSONObject(DOC_ATTACHMENTS);
            docRevisionJSON.remove(DOC_ATTACHMENTS);
            attachmentMap = new HashMap<String, Attachment>();

            Iterator<String> keys = attachments.keys();
            while (keys.hasNext()) {
                String name = keys.next();
                JSONObject attachment = attachments.getJSONObject(name);

                String contentType = attachment.getString(DOC_ATTACHMENTS_CONTENT_TYPE);
                String data = attachment.getString("data");
                byte[] bytes = Base64.decode(data, Base64.NO_WRAP);

                UnsavedStreamAttachment streamAttachment = new UnsavedStreamAttachment(new ByteArrayInputStream(bytes), contentType);
                attachmentMap.put(name, streamAttachment);
            }
            revision.setAttachments(attachmentMap);
        }

        revision.setBody(DocumentBodyFactory.create(getMapFromJSONObject(docRevisionJSON)));

        return revision;
    }


    /**
     * @param rev - The DocumentRevision to transform
     * @return - The JSONObject from the converted DocumentRevision
     * @throws JSONException
     * @throws IOException
     */
    private JSONObject buildJSON(DocumentRevision rev, boolean isCreate) throws JSONException, IOException {
        JSONObject result = new JSONObject();
        result.put(DOC_ID, rev.getId());
        result.put(DOC_REV, rev.getRevision());

        if (!isCreate) {
            result.put(DOC_DELETED, rev.isDeleted());
        }

        if (!rev.isDeleted()) {
            Map<String, Attachment> attachmentMap = rev.getAttachments();
            if (attachmentMap != null && !attachmentMap.isEmpty()) {
                JSONObject attachments = new JSONObject();

                for (Map.Entry<String, Attachment> entry : attachmentMap.entrySet()) {
                    Attachment attachment = entry.getValue();


                    InputStream is = attachment.getInputStream();
                    byte[] bytes = IOUtils.toByteArray(is);
                    String data = Base64.encodeToString(bytes, Base64.NO_WRAP);

                    JSONObject attachmentJSON = new JSONObject();
                    attachmentJSON.put(DOC_ATTACHMENTS_CONTENT_TYPE, attachment.type);
                    attachmentJSON.put(DOC_ATTACHMENTS_DATA, data);

                    attachments.put(entry.getKey(), attachmentJSON);
                }

                result.put(DOC_ATTACHMENTS, attachments);
            }
        }
        Map<String, Object> body = rev.getBody().asMap();

        for (Map.Entry<String, Object> entry : body.entrySet()) {
            result.put(entry.getKey(), entry.getValue());
        }

        return result;
    }

    /**
     * This transformer method performs a deeper conversion
     *
     * @param json - The JSONObject to transform
     * @return - The Map from the converted JSONObject
     * @throws JSONException
     */
    private Map<String, Object> convertJSONtoMap(JSONObject json) throws JSONException {
        Map<String, Object> ret = new HashMap<String, Object>();

        if (json != JSONObject.NULL) {
            ret = toMap(json);
        }

        return ret;
    }

    /**
     * Utility method for convertJSONtoMap(). This converts nested JSONObjects & JSONArrays to Maps and Lists
     *
     * @param json - The JSONObject to transform
     * @return - The Map from the converted JSONObject
     * @throws JSONException
     */
    private Map<String, Object> toMap(JSONObject json) throws JSONException {
        Map<String, Object> ret = new HashMap<String, Object>();

        Iterator<String> iter = json.keys();

        while (iter.hasNext()) {
            String key = iter.next();
            Object value = json.get(key);

            if (value instanceof JSONObject) {
                value = toMap((JSONObject) value);
            } else if (value instanceof JSONArray) {
                value = toList((JSONArray) value);
            }
            ret.put(key, value);
        }

        return ret;
    }

    /**
     * Utility method for convertJSONtoMap(). This converts nested JSONObjects & JSONArrays to Maps and Lists
     *
     * @param json - The JSONArray to transform
     * @return - The List from the converted JSONArray
     * @throws JSONException
     */
    private List<Object> toList(JSONArray json) throws JSONException {
        List<Object> ret = new ArrayList<Object>();

        for (int i = 0; i < json.length(); i++) {
            Object value = json.get(i);

            if (value instanceof JSONObject) {
                value = toMap((JSONObject) value);
            } else if (value instanceof JSONArray) {
                value = toList((JSONArray) value);
            }
            ret.add(value);
        }

        return ret;
    }

    /**
     * @param state - The Replicator State to transform
     * @return - The String from the converted Replicator State
     */
    private String convertReplicationStateToString(Replicator.State state) {
        switch (state) {
            case COMPLETE:
                return "Complete";
            case ERROR:
                return "Error";
            case PENDING:
                return "Pending";
            case STARTED:
                return "Started";
            case STOPPED:
                return "Stopped";
            case STOPPING:
                return "Stopping";
            default:
                return "Unknown";
        }
    }

}
