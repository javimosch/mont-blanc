var req         = (n) => require(process.cwd()+'/model/tasks/'+n);
var tasks = [
    req('task.diplomeExpiration'),
    req('task.deleteTemporalFiles'),
    req('task.diags-remove-unpaid-orders')
];
exports.configure = (app) => {
    tasks.forEach((t) => {
        function loop() {
            console.log('task-manager:start: ' + t.name);
            try {
                t.handler(t, app);
            }
            catch (e) {
                console.log('task-manager-exception', e);
            }
        }
        setInterval(() => {
            loop
        }, t.interval);


        if (t.startupInterval) {
            loop();
        }
        else {
            if (t.startupIntervalDelay) {
                setTimeout(loop, t.startupIntervalDelay || 0);
            }
        }
    });
}
