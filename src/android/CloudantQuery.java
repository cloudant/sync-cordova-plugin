package com.cloudant.sync.cordova;

import java.util.List;
import java.util.Map;

/**
 * The CloudantQuery class provides convenience methods for accessing the properties of a Cloudant Query and interacting with the 'find' API
 */
class CloudantQuery {
    private static final String SELECTOR_KEY = "selector";
    private static final String LIMIT_KEY = "limit";
    private static final String SKIP_KEY = "skip";
    private static final String FIELDS_KEY = "fields";
    private static final String SORT_KEY = "sort";

    private Map<String, Object> selector;
    private long limit;
    private long skip;
    private List<String> fields;
    private List<Map<String, String>> sort;

    @SuppressWarnings("unchecked")
    public CloudantQuery(Map<String, Object> map) {

        if (map.containsKey(SELECTOR_KEY)) {
            this.selector = (Map<String, Object>) map.get(SELECTOR_KEY);
            this.limit = map.containsKey(LIMIT_KEY) ? ((Number) map.get(LIMIT_KEY)).longValue() : 0;
            this.skip = map.containsKey(SKIP_KEY) ? ((Number) map.get(SKIP_KEY)).longValue() : 0;
            this.fields = (List<String>) map.get(FIELDS_KEY);
            this.sort = (List<Map<String, String>>) map.get(SORT_KEY);
        } else {
            this.selector = map;
        }
    }

    public Map<String, Object> getSelector() {
        return selector;
    }

    public long getLimit() {
        return limit;
    }

    public long getSkip() {
        return skip;
    }

    public void setSkip(long skip) {
        this.skip = skip;
    }

    public List<String> getFields() {
        return fields;
    }

    public List<Map<String, String>> getSort() {
        return sort;
    }
}
