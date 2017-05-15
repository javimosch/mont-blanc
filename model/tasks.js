var req = (n) => require(process.cwd() + '/model/tasks/' + n);
var tasks = [
    req('task.diplomeExpiration'),
    req('task.deleteTemporalFiles'),
    req('task.diags-remove-unpaid-orders'),
    req('task-remove-expired-work-execeptions'),
    req('check-and-send-unsended-notifications-task'),
    req('completed-order-notifications-task'),
    req('sync-guest-account-task')
];
var selectController = require('./db.controller').create;
var Logger = null;
function loggerLazyInitialization() {
    if (Logger) return Logger;
    Logger = selectController('Log').createLogger({
        name: "AUTOMATED-TASK",
        category: "MANAGER"
    });
}
exports.configure = (app) => {
    loggerLazyInitialization();
    tasks.forEach((t) => {
        function loop() {
            try {
                t.handler(t, app);
            }
            catch (err) {
                Logger.setSaveData(err);
                Logger.errorSave('Automated Task crash');
            }
        }
        setInterval(() => {
            loop();
        }, t.interval);


        if (t.runAtStartup) {
            if (t.runAtStartupDelay!==undefined) {
                setTimeout(loop, t.runAtStartupDelay);
            }else{
                loop();
            }
        }
    });
};
