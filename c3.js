/** @param {NS} ns **/
/*
    C3: Command and Control v3

    This service discovers any unhacked servers on the network and
    attempts to breach them automatically every 5 minutes.

    Also redeploys the entire network every 5 minutes.

    The sleep function can be used to slow down processing for debugging.
    The hibernate function can be used to configure the retry interval.
*/

class Target {
    constructor(host, skill, ssh, ftp, sql, smtp, http) {
        this.host = host
        this.skill = skill
        this.ssh = ssh
        this.ftp = ftp
        this.sql = sql
        this.smtp = smtp
        this.http = http
    }
}

class Server {
    constructor(host, hack, grow, weaken) {
        this.host = host
        this.hack = hack
        this.grow = grow
        this.weaken = weaken
    }
}

/*
    Begin Common Functions
*/

async function sleep(ns) {
    await ns.sleep(1)
}

async function hibernate(ns) {
    var time = 60000 * 5
    ns.print(`💤 Hibernating for ${time / 60000} minutes...`)
    await ns.sleep(time)
}

async function spider(ns) {
    var serversSeen = ['home']
    for (var i = 0; i < serversSeen.length; i++) {
        await sleep(ns) // sleep for effect
        var thisScan = ns.scan(serversSeen[i]);
        for (var j = 0; j < thisScan.length; j++) {
            if (serversSeen.indexOf(thisScan[j]) === -1) {
                serversSeen.push(thisScan[j]);
            }
        }
    }
    ns.print(`🔎 Found ${serversSeen.length} servers.`)
    return serversSeen;
}

/*
    End Common Functions
    Begin Hacking Functions
*/

async function configure_hack(ns, servers) {
    var configured_servers = [];
    var target_count = 0;
    var hacker_skill = ns.getHackingLevel()
    for (var i = 0; i < servers.length; i++) {
        await sleep(ns) // sleep for effect
        var server_details = ns.getServer(servers[i])
        if (!server_details.hasAdminRights) {
            // if (!server_details.hasAdminRights && hacker_skill > server_details.requiredHackingSkill) {
            /*
                not checking the required hacking skills targets more servers
                these servers can be rooted but the c2/hack.script cannot run
                there is no benefit to rooting servers we can't hack yet, so they are left alone
            */
            configured_servers.push(new Target(
                server_details.hostname,
                server_details.requiredHackingSkill,
                server_details.sshPortOpen,
                server_details.ftpPortOpen,
                server_details.sqlPortOpen,
                server_details.smtpPortOpen,
                server_details.httpPortOpen))
            target_count++
        }
    }
    ns.print(`🎯 Targeted: ${target_count} servers.`)
    return configured_servers
}

async function hack_targets(ns, scope) {
    var assets = []
    var run_nuke = ns.fileExists('NUKE.exe')
    var break_ssh = ns.fileExists('BruteSSH.exe')
    var break_ftp = ns.fileExists('FTPCrack.exe')
    var break_sql = ns.fileExists('SQLInject.exe')
    var break_smtp = ns.fileExists('relaySMTP.exe')
    var break_http = ns.fileExists('HTTPWorm.exe')
    for (var i = 0; i < scope.length; i++) {
        if (break_ssh && !scope[i].ssh) {
            await ns.brutessh(scope[i].host)
            ns.print(`Opened SSH on ${scope[i].host}`)
        }
        if (break_ftp && !scope[i].ftp) {
            await ns.ftpcrack(scope[i].host)
            ns.print(`Opened FTP on ${scope[i].host}`)
        }
        if (break_sql && !scope[i].sql) {
            await ns.sqlinject(scope[i].host)
            ns.print(`Opened SQL on ${scope[i].host}`)
        }
        if (break_smtp && !scope[i].smtp) {
            await ns.relaysmtp(scope[i].host)
            ns.print(`Opened SMTP on ${scope[i].host}`)
        }
        if (break_http && !scope[i].http) {
            await ns.httpworm(scope[i].host)
            ns.print(`Opened HTTP on ${scope[i].host}`)
        }
        var required_ports = ns.getServerNumPortsRequired(scope[i].host)
        var open_ports = ns.getServer(scope[i].host).openPortCount

        if (open_ports >= required_ports && run_nuke) {
            ns.print(`☢️ Nuking ${scope[i].host}!`)
            await ns.nuke(scope[i].host)
            assets.push(scope[i].host)
        }
    }
    if (assets.length > 0) { ns.print(`✅ Hacked ${assets.length} servers.`) }
    else { ns.print(`❌ Hacked 0 servers.`) }
}

/*
    End Hacking Functions
    Begin Deployment Functions
*/

async function configure_deployment(ns, servers, allocation_bias) {
    var deployment_configuration = [];
    for (var i = 0; i < servers.length; i++) {
        var server = ns.getServer(servers[i])
        if (server.hasAdminRights) {
            var thread_allocation = allocate_threads(ns, server.maxRam, allocation_bias)
            deployment_configuration.push(new Server(server.hostname, thread_allocation.hack, thread_allocation.grow, thread_allocation.weaken))
        }
    }
    var hc = 0; var gc = 0; var wc = 0;
    for (var j = 0; j < deployment_configuration.length; j++) { hc += deployment_configuration[j].hack; gc += deployment_configuration[j].grow; wc += deployment_configuration[j].weaken }
    ns.print(`📃 Deploying to ${servers.length} servers (hack: ${hc} grow: ${gc} weaken: ${wc})`)
    return deployment_configuration
}

function allocate_threads(ns, ram, allocation_bias) {
    var thread_allocation = { hack: 0, grow: 0, weaken: 0 }
    var max_threads = Math.floor(ram / ns.getScriptRam('/utils/grow.js'))
    thread_allocation.hack = Math.ceil(max_threads * allocation_bias.hack)
    thread_allocation.grow = Math.floor(max_threads * allocation_bias.grow)
    thread_allocation.weaken = Math.floor(max_threads * allocation_bias.weaken)
    return thread_allocation
}

async function deploy_network(ns, deployment_configuration, target) {
    for (var i = 1; i < deployment_configuration.length; i++) {
        await sleep(ns)
        await ns.killall(deployment_configuration[i].host)
        Promise.all([
            await ns.scp('/utils/hack.js', deployment_configuration[i].host),
            await ns.scp('/utils/grow.js', deployment_configuration[i].host),
            await ns.scp('/utils/weaken.js', deployment_configuration[i].host)
        ])
        if (deployment_configuration[i].hack > 0) { await ns.exec('/utils/hack.js', deployment_configuration[i].host, deployment_configuration[i].hack, target) }
        if (deployment_configuration[i].grow > 0) { await ns.exec('/utils/grow.js', deployment_configuration[i].host, deployment_configuration[i].grow, target) }
        if (deployment_configuration[i].weaken > 0) { await ns.exec('/utils/weaken.js', deployment_configuration[i].host, deployment_configuration[i].weaken, target) }
    }
    ns.print(`🤖 Deployed ${deployment_configuration.length} servers!`)
}

/*
    End Deployment Functions
    Begin Main Function
 */

export async function main(ns) {
    await ns.disableLog('ALL')
    var target_server = 'megacorp'
    var allocation_bias = { hack: 0.00001, grow: 0.60, weaken: 0.39999 }

    ns.toast(`Hacking script beginning execution...`)
    ns.print(`🟢 Hacking script beginning execution...`)
    var targets = await spider(ns) 														    // get all servers
    await hack_targets(ns, await configure_hack(ns, targets)) 							    // hack available servers
    var deployment_configuration = await configure_deployment(ns, targets, allocation_bias)	// create a deployment config
    await deploy_network(ns, deployment_configuration, target_server) 					    // run the deployment config
    ns.toast(`Hacking script completed execution!`)
    ns.print(`🔴 Hacking script completed execution!`)
}
