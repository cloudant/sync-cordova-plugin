module.exports = function(ctx) {
    var deferral = ctx.requireCordovaModule('q').defer();
    var exec = require('child_process').exec,
        child;

     child = exec('npm install', {cwd: ctx.opts.plugin.dir},
     function (error, stdout, stderr) {
         console.log('stdout: ' + stdout);
         console.log('stderr: ' + stderr);
         if (error !== null) {
              console.log('exec error: ' + error);
         }
         deferral.resolve();
     });

    return deferral.promise;
};
