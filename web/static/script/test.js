
var SCALE_OFFSET = [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6];
var SCALE_LEN = Math.ceil(SCALE_OFFSET[SCALE_OFFSET.length - 1] + .5);
var KEY0 = 21; // A
var FREQ0 = 440. / Math.pow(2., 4.); // 4 octaves below A440
var KEY_ASPECT = 6.;
var BEAT_SZ = 6.;

var NUM_WHITE_KEYS = 52;
var TOTAL_KEYS = 88;

function clock() {
    return new Date().getTime() / 1000.;
}

function PianoKey(i) {
    this.i = i;
    this.status = false;
    this.last_on = null;
    this.cb = function(status) {};

    this.white = function() {
        return (this.offset() % 1. == 0.);
    }

    this.key = function() {
        return this.i + KEY0;
    }

    this.offset = function() {
        return SCALE_OFFSET[this.key() % SCALE_OFFSET.length];
    }

    this.center = function() {
        return SCALE_LEN * Math.floor(this.key() / SCALE_OFFSET.length) + this.offset() -
        (SCALE_LEN + SCALE_OFFSET[KEY0 % SCALE_OFFSET.length]); // clean this up
    }

    this.dim = function() {
        return {
            width: (this.white() ? 1. : .5),
            height: KEY_ASPECT * (this.white() ? 1. : .6),
        };
    }

    this.default_color = function() {
        return this.white() ? 'white' : 'black';
    }

    this.freq = function() {
        return FREQ0 * Math.pow(2., this.i / SCALE_OFFSET.length)
    }

    this.set_status = function(active) {
        this.status = active;
        if (active) {
            this.last_on = clock();
        }
        this.$svg.attr({fill: active ? 'orange' : this.default_color()});
    }

    this.init_svg = function(ctx, frame) {
        var dim = this.dim();
        this.svg = ctx.rect(frame, this.center() + .5 - .5 * dim.width, KEY_ASPECT - dim.height, dim.width, dim.height);
        this.$svg = $(this.svg);
        this.$svg.attr({fill: this.default_color(), stroke: 'black', 'stroke-width': .05});
        var key = this;
        this.$svg.hover(function() {
                key.set_status(true);
                key.cb(true);
            },
            function() {
                key.set_status(false);
                key.cb(false);
            });
    }
}

function init_keyboard() {
    $('#canvas').svg({onLoad:
            function(ctx) {
                $.get('/pianoroll', function(data) {
                        var trainer = new TrainingSession(ctx, data);
                        trainer.start();
                    });
            }
        });
}

function Keyboard(ctx, frame) {
    var kbd = this;

    this.ctx = ctx;

    this.init = function() {
        this.frame = this.ctx.group(frame, {transform: 'scale(' + 1/NUM_WHITE_KEYS + ')'});
    
        this.keys = [];
        for (var i = 0; i < TOTAL_KEYS; i++) {
            this.keys.push(new PianoKey(i));
        }
        $.each([true, false], function(i, mode) {
                // draw white keys first, then black
                $.each(kbd.keys, function(i, e) {
                        if (e.white() == mode) {
                            e.init_svg(kbd.ctx, kbd.frame);
                        }
                    });
            });

        this.conn = new WebSocket('ws://' + window.location.host + '/socket');
        this.conn.onopen = function () {
            $.each(kbd.keys, function(i, e) {
                    e.cb = function(status) {
                        kbd.conn.send(JSON.stringify({status: status ? 'on' : 'off', note: this.key()}));
                    };
                });
        };
        this.conn.onerror = function (error) {
            console.log('websocket error ' + error);
        };
        this.conn.onmessage = function (e) {
            var data = JSON.parse(e.data);
            $.each(data, function(i, evt) {
                    var key = kbd.keys[evt.note - KEY0];
                    key.set_status(evt.state == 'on');
                });
        };
    }

    this.currently_pressed = function() {
        var pressed = {};
        $.each(this.keys, function(i, e) {
                if (e.status) {
                    pressed[e.i] = e.last_on;
                }
            });
        return pressed;
    }

    this.init();
}

function PianoRoll(ctx, frame, data) {
    var pr = this;

    this.init = function() {
        var g = ctx.group(frame, {
                transform: 'translate(0,' + (KEY_ASPECT/NUM_WHITE_KEYS) + ') scale(' + 1/TOTAL_KEYS + ')',
                fill: '#ccf',
                stroke: 'black',
                'stroke-width': .05
            });
        this.pane = ctx.group(g);

        $.each(data, function(k, v) {
                $.each(v, function(i, e) {
                        var r = ctx.rect(pr.pane, (e.note - 21), BEAT_SZ * e.beat, 1., BEAT_SZ * e.duration);
                    });
            });               
    }

    this.set_time = function(t) {
        $(this.pane).attr('transform', 'translate(0, ' + -BEAT_SZ*t + ')');
    }

    this.init();
}

function TrainingSession(ctx, data) {
    var trainer = this;

    this.tempo = 40; // quarter notes per minute
    this.clock = 0;
    this.last_started = null;

    this.init = function() {
        var w = $('#canvas').width();
        var h = $('#canvas').height();
        var g = ctx.group({transform: 'scale(' + w + ',' + -w + ') translate(0,' + (-h/w) + ')'});

        this.pianoroll = new PianoRoll(ctx, g, data);
        this.keyboard = new Keyboard(ctx, g);
    }

    this.tick = function(t) {
        this.pianoroll.set_time(t / 60. * this.tempo);
    }

    this.start = function() {
        var TICK = 0.01;
        var t0 = clock();
        setInterval(function() { trainer.tick(clock() - t0); }, 1000. * TICK);
    }

    this.init();
}