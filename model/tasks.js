var req = (n) => require(process.cwd() + '/model/tasks/' + n);
var tasks = [
    req('task.diplomeExpiration'),
    req('task.deleteTemporalFiles'),
    req('task.diags-remove-unpaid-orders'),
    req('task-remove-expired-work-execeptions')
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
            loop();
        }, t.interval);


        if (t.runAtStartup) {
            if (t.runAtStartupDelay) {
                setTimeout(loop, t.runAtStartupDelay || 0);
            }else{
                loop();
            }
        }
    });
};
