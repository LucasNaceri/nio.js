var _ = require('lodash')
var url = require('url')
var d3 = require('d3')
var util = require('util')
var Stream = require('./stream')
var utils = require('./utils')

function JSONStream(uri, autostart) {
	if (!(this instanceof JSONStream))
		return new JSONStream(uri)
	this.uri = uri
	Stream.call(this)

	if (autostart)
		this.resume(false)
}

util.inherits(JSONStream, Stream)

// applys query parameters to a uri
function applyParams(uri, params) {
	var u = url.parse(uri, true)
	u.search = null
	u.query = params
	return u.format()
}

JSONStream.prototype.onresume = function () {
	var uri = applyParams(this.uri, this.params)
	this.xhr = d3.json(uri, function (error, json) {
		this.push(json)
	}.bind(this))
}

JSONStream.prototype.onreset = function () {
	this.params = {}
	if (this.xhr) this.xhr.abort()
}

JSONStream.prototype.onfilter = function (params) {
	console.log('json got params', params)
	this.reset(false)
	this.params = params
	this.resume(false)
}

function SocketIOStream(opts) {
	if (!(this instanceof SocketIOStream))
		return new SocketIOStream(opts)
	this.host = opts.host
	this.rooms = opts.rooms
	Stream.call(this)
}

util.inherits(SocketIOStream, Stream)

SocketIOStream.prototype.oninit = function () {
	/* global io */
	if (!window.io) {
		var s = utils.script(this.host + '/socket.io/socket.io.js')
		s.onload = function () { this.oninit() }.bind(this)
		return this
	}

	var sock = io.connect(this.host, {'connect timeout': 10000});

	sock.on('connect', function () {
		_.each(this.rooms, function (room) {
			sock.emit('ready', room)
		}, this)
	}.bind(this))
	sock.on('connect_failed', function (e) {
		console.error('connection failed');
		console.error(e);
	})
	sock.on('error', function (e) {
		console.error('connection error');
		console.error(e);
	})
	sock.on('recvData', function (data) {
		//if (this.state === Stream.STATES.PAUSE) return
		this.push(JSON.parse(data))
	}.bind(this))
	return this
}

SocketIOStream.prototype.onresume = function () { }

SocketIOStream.prototype.onreset = function () { }

function GeneratorStream(msg, rate) {
	if (!(this instanceof GeneratorStream))
		return new GeneratorStream(msg, rate)
	this.msg = msg || 'Hello world'
	this.rate = rate || 1000
	Stream.call(this)
}

util.inherits(GeneratorStream, Stream)

GeneratorStream.prototype.oninit = function () { this.onresume() }

GeneratorStream.prototype.onresume = function () {
	this.interval = setInterval(function () {
		this.push(_.isFunction(this.msg) ? this.msg() : this.msg)
	}.bind(this), this.rate)
	return this
}

GeneratorStream.prototype.onpause = function () {
	this.onreset()
	return this
}

GeneratorStream.prototype.onreset = function () {
	if (this.interval) clearInterval(this.interval)
}

module.exports = {
	SocketIOStream: SocketIOStream,
	socketio: SocketIOStream,
	JSONStream: JSONStream,
	json: JSONStream,
	GeneratorStream: GeneratorStream,
	generate: GeneratorStream
}
