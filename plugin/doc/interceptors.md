HTTP Interceptors
=====

HTTP Interceptors allow the developer to modify the HTTP requests and responses during
the replication process.

Interceptors can be used to implement your own authentication schemes, for example OAuth, or
provide custom headers so you can perform your own analysis on usage. They can also be used
to monitor or log the requests made by the library.

To monitor or make changes to HTTP requests, implement a function that takes a HttpInterceptorContext. This HttpInterceptorContext can be manipulated to modify an outgoing request or be used to examine an incoming response. When an interceptor has finished executing, the HttpInterceptorContext will be passed to the next interceptor in queue. To complete the execution of an interceptor, HttpInterceptorContext#done() must be called;

Below is an example of how to implement a interceptor:

```js
var requestInterceptor = function (httpInterceptorContext) {
    console.log("Calling URL: " + httpInterceptorContext.request.url);
    httpInterceptorContext.done();
};

var responseInterceptor = function (httpInterceptorContext) {
    console.log("Received response; URL: " + httpInterceptorContext.request.url + "; status code: " + httpInterceptorContext.response.statusCode + ".");
    httpInterceptorContext.done();
}
```


In order to add an HTTP Interceptor to a replication, you call the `addRequestInterceptors`
or `addResponseInterceptors` on the `ReplicatorBuilder` object.

For example, this is how to add the request and response interceptors shown in the example above to a pull replication:

```js

var builder = new ReplicatorBuilder();
builder.pull()
    .from(new URI("https://username.cloudant.com"))
    .to(ds)
    .addRequestInterceptors(requestInterceptor)
    .addResponseInterceptors(responseInterceptor)
    .build()
        .then(function (replicator) {
            replicator.start();
        });
```

## Adding Custom Request Headers

Request Interceptors can be used to add custom HTTP headers by
modifying the 'headers' property, as in this example:

```js
var requestInterceptor = function (httpInterceptorContext) {
    httpInterceptorContext.request.headers['x-my-header'] = 'value';
    httpInterceptorContext.done();
};
```

## Things to Know

Currently the API has only been tested and verified for the following:

* Request Interceptors can modify the request headers.
* Response Interceptors can only set the HttpInterceptorContext 'replayRequest' property.

Changing anything else is unsupported. In the future, the number of supported APIs
is likely to be expanded.
