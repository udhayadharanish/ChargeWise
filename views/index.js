const http = require('https');

const options = {
	method: 'GET',
	hostname: 'trueway-matrix.p.rapidapi.com',
	port: null,
	path: '/CalculateDrivingMatrix?origins=11.004556%2C76.961632&destinations=28.644800%2C77.1025&avoid_highways=true&avoid_tolls=true&avoid_ferries=true',
	headers: {
		'x-rapidapi-key': '998d91f4fcmsh946de144f469081p135899jsn50f694b83e94',
		'x-rapidapi-host': 'trueway-matrix.p.rapidapi.com',
		'Content-Type': 'application/json'
	}
};

const req = http.request(options, function (res) {
	const chunks = [];

	res.on('data', function (chunk) {
		chunks.push(chunk);
	});

	res.on('end', function () {
		const body = Buffer.concat(chunks);
		console.log(body.toString());
	});
});

req.end();