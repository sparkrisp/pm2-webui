const pm2 = require('pm2');
const { exec } = require('child_process');
const { bytesToSize, timeSince } = require('./ux.helper');

function listApps(){
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                reject(err)
            }
            pm2.list((err, apps) => {
                pm2.disconnect()
                if (err) {
                    reject(err)
                }
                apps = apps.map((app) => {
                    return {
                        name: app.name,
                        status: app.pm2_env.status,
                        cpu: app.monit.cpu,
                        memory: bytesToSize(app.monit.memory),
                        uptime: timeSince(app.pm2_env.pm_uptime),
                        pm_id: app.pm_id
                    }
                })
                resolve(apps)
            })
        })
    })
}

function describeApp(appName){
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                reject(err)
            }
            pm2.describe(appName, (err, apps) => {
                pm2.disconnect()
                if (err) {
                    reject(err)
                }
                if(Array.isArray(apps) && apps.length > 0){
                    const app = {
                        name: apps[0].name,
                        status: apps[0].pm2_env.status,
                        cpu: apps[0].monit.cpu,
                        memory: bytesToSize(apps[0].monit.memory),
                        uptime: timeSince(apps[0].pm2_env.pm_uptime),
                        pm_id: apps[0].pm_id,
                        pm_out_log_path: apps[0].pm2_env.pm_out_log_path,
                        pm_err_log_path: apps[0].pm2_env.pm_err_log_path,
                        pm2_env_cwd: apps[0].pm2_env.pm_cwd
                    }
                    resolve(app)
                }
                else{
                    resolve(null)
                }
            })
        })
    })
}

function npmInstallAndRestart(appName) {
    return new Promise((resolve, reject) => {
        // Primero obtenemos la información de la aplicación para saber su directorio
        describeApp(appName)
            .then(app => {
                if (!app) {
                    reject(new Error(`Application ${appName} not found`));
                    return;
                }

                const workDir = app.pm2_env_cwd;
                
                // Ejecutamos npm install en el directorio de la aplicación
                exec('npm install', { cwd: workDir }, (error, stdout, stderr) => {
                    if (error) {
                        reject(new Error(`npm install failed: ${error.message}\n${stderr}`));
                        return;
                    }

                    // Una vez completado npm install, reiniciamos la aplicación
                    pm2.connect((err) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        pm2.restart(appName, (err, proc) => {
                            pm2.disconnect();
                            if (err) {
                                reject(err);
                                return;
                            }
                            resolve({
                                npmOutput: stdout,
                                process: proc
                            });
                        });
                    });
                });
            })
            .catch(reject);
    });
}

function reloadApp(process){
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                reject(err)
            }
            pm2.reload(process, (err, proc) => {
                pm2.disconnect()
                if (err) {
                    reject(err)
                }
                resolve(proc)
            })
        })
    })
}

function stopApp(process){
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                reject(err)
            }
            pm2.stop(process, (err, proc) => {
                pm2.disconnect()
                if (err) {
                    reject(err)
                }
                resolve(proc)
            })
        })
    })
}

function restartApp(process){
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                reject(err)
            }
            pm2.restart(process, (err, proc) => {
                pm2.disconnect()
                if (err) {
                    reject(err)
                }
                resolve(proc)
            })
        })
    })
}

module.exports = {
    listApps,
    describeApp,
    reloadApp,
    stopApp,
    restartApp,
    npmInstallAndRestart
}
