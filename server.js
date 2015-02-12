'use strict';

var os = require('os');
var ifaces = os.networkInterfaces();

var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World\n');
}).listen(1337, '127.0.0.1');
//console.log('Server running at: http://'+iface.address+":"+iface.port);

getLocalIP();

function getLocalIP() {

    Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0
            ;

        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }

            if (alias >= 1) {
                // this single interface has multiple ipv4 addresses
                console.log(ifname + ':' + alias, iface.address);
            } else {
                // this interface has only one ipv4 adress
                console.log(ifname, iface.address);
                console.log(iface.address+":"+iface.localPort);
            }
        });
    });
}