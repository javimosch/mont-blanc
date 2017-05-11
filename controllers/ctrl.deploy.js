var resolver = require('../model/facades/resolver-facade');
module.exports = {
    deployUsingSSH: deployUsingSSH
};

function deployUsingSSH(data, cb) {
    return resolver.ssh().sendCommand({
        command: "cd~; cd diags; ./deploy_tag.sh",
        args: [data.name],
        password: data.password
    }).then(r => cb(null, r)).catch(cb);
}
