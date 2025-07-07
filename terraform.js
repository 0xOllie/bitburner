/** @param {NS} ns **/
/*
    Terraform: The BitBurner version of IaC

*/

class Specsheet {
    constructor() {
        this.ram_target = Math.pow(2, 1)
        this.ram_maximum = Math.pow(2, 20)
        this.server_maximum = 25
        this.server_list = []

    }
    update_ram(ram_target) {
        if (ram_target <= this.ram_maximum && ram_target >= this.ram_target) {
            this.ram_target = ram_target
        }
    }
    update_servers(servers) {
        this.server_list = servers
    }
    add_server(server) {
        if (server_list.length <= server_maximum) {
            this.server_list.push(server)
        }
    }
    remove_server(server) {
        for (let i = 0; i < this.server_list.length; i++) {
            if (server == this.server_list[i]) {
                this.server_list.splice(i)
            }
        }
    }
}

async function get_ram(ns, servers) {
    let target_ram = 2 // this is the smallest ram size
    let server_count = servers.length
    if (server_count > 0) {
        for (let i = 0; i < server_count; i++) {
            let server_ram = ns.getServerMaxRam(servers[i])
            if (server_ram <= target_ram) {
                target_ram = server_ram
            }
        }
    }
    ns.print(`${timestamp()} 🚧 Current server ram: ${target_ram}`)
    return target_ram
}

async function maximise(ns, ram) {
    let cash = ns.getPlayer().money
    let cost = ns.getPurchasedServerCost(ram)
    while (cost <= cash) {
        ram = Math.pow(2, Math.log2(ram) + 1)
        cost = ns.getPurchasedServerCost(ram)
    }
    // ram = Math.pow(2, Math.log2(ram) - 1)
    ns.print(`${timestamp()} 🎯 RAM target set: ${ram}`)
    return ram
}

async function bootstrap(ns) {
    let specsheet = new Specsheet()
    specsheet.update_ram(await get_ram(ns, ns.getPurchasedServers())) // get a inital RAM reading
    specsheet.update_servers(ns.getPurchasedServers())
    specsheet.update_ram(await maximise(ns, specsheet.ram_target)) // update the ram target to the next biggest I can afford
    ns.print(`${timestamp()} ✅ Bootstraped server list!`)
    return specsheet
}

function name(length) {
    var result = '';
    var characters = 'abcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return `ec2-${result}`;
}

async function purchase_all(ns, specsheet) {
    if (specsheet.server_list.length < specsheet.server_maximum) {
        let shopping_cart = specsheet.server_maximum - specsheet.server_list.length
        ns.print(`${timestamp()} 🔼 Buying ${shopping_cart} servers at minimum configuration `)
        for (let i = 0; i < shopping_cart; i++) { ns.purchaseServer(name(10), 2) }
    } else {
        ns.print(`${timestamp()} ⏹ Maximum server count reached.`)
    }
    specsheet.update_servers(ns.getPurchasedServers())
    return specsheet
}

async function upgrade_server(ns, server, target) {
    let current_ram = ns.getServerMaxRam(server)
    ns.killall(server)
    ns.deleteServer(server)
    ns.purchaseServer(server, target)
    ns.print(`${timestamp()} 🆙 Upgraded ${server} from ${current_ram}GB to ${target} for ${ns.getPurchasedServerCost(target)}`)
}

async function upgrade_network(ns, specsheet) {
    for (let i = 0; i < specsheet.server_list.length; i++) {
        if (ns.getServerMaxRam(specsheet.server_list[i]) < specsheet.ram_target) {
            if (ns.getPlayer().money > ns.getPurchasedServerCost(specsheet.ram_target)) {
                await upgrade_server(ns, specsheet.server_list[i], specsheet.ram_target)
            } else {
                ns.print(`${timestamp()} 🏦 ${Math.floor(ns.getPlayer().money / ns.getPurchasedServerCost(specsheet.ram_target) * 100)}% of cost required.`)
                // await ns.sleep(600000)
                await ns.sleep(60000)
                await upgrade_network(ns, specsheet)
            }
        }
    }
    return specsheet
}

function timestamp() {
    let date = new Date()
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
}

export async function main(ns) {
    await ns.disableLog('ALL')
    ns.print(`                 Terraform\n================= ${timestamp()} =================`)
    let specsheet = await bootstrap(ns)
    specsheet = await purchase_all(ns, specsheet)
    specsheet = await upgrade_network(ns, specsheet)
    ns.print(`${timestamp()} 🛑 Network is at maximum capacity, exiting.`)
}
