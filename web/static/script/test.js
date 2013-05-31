
var SCALE_OFFSET = [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6];
var SCALE_LEN = Math.ceil(SCALE_OFFSET[SCALE_OFFSET.length - 1] + .5);
var KEY0 = 21; // A
var FREQ0 = 440. / Math.pow(2., 4.); // 4 octaves below A440
var WIDTH_W = 30;

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
            width: this.white() ? WIDTH_W : .5 * WIDTH_W,
            height: this.white() ? 150 : 90,
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
        this.svg.attr({fill: active ? 'orange' : this.default_color()});
    }

    this.init_svg = function(ctx) {
        var dim = this.dim();
        this.svg = ctx.rect(100 + this.center() * WIDTH_W - .5 * dim.width, 100, dim.width, dim.height)
        this.svg.attr({fill: this.default_color()});
        var key = this;
        this.svg.hover(function() {
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
                //var trainer = new TrainingSession(ctx);
                //trainer.start();
                init_pianoroll(ctx);
            }
        });
}

function init_pianoroll(ctx) {
    //var MODE = 'horiz';
    var MODE = 'vert';

    $.get('/pianoroll', function(data) {
            var g = ctx.group({fill: '#ccf', stroke: 'black'});

            $.each(data, function(k, v) {
                    $.each(v, function(i, e) {
                            var r;
                            if (MODE == 'horiz') {
                                var NOTE_SZ = 5;
                                var BEAT_SZ = 25;
                                r = ctx.rect(g, e.beat * BEAT_SZ, (127 - e.note) * NOTE_SZ, e.duration * BEAT_SZ, NOTE_SZ);
                            } else {
                                var BEAT_SZ = 100; //200;
                                var y = function(b) {
                                    return 950 - BEAT_SZ * b; // * (Math.log(b + 1) - Math.log(1.));
                                }

                                var NOTE_SZ = 1500 / 88.;

                                /*
                                if (e.beat > 50) {
                                    return;
                                }
                                */

                                r = ctx.rect(g, (e.note - 9) * NOTE_SZ, y(e.beat + e.duration), NOTE_SZ, y(e.beat) - y(e.beat + e.duration));
                            }
                        });
                });

            var blah = function(clock) {
                $(g).attr('transform', 'translate(0, ' + (60. * clock * .001) + ')');
                requestAnimationFrame(blah);
            };
            requestAnimationFrame(blah);
        });

}

function init_trainer() {

}

function Keyboard(canvas) {
    var kbd = this;

    this.ctx = canvas;

    this.init = function() {
        this.keys = [];
        for (var i = 0; i < 88; i++) {
            this.keys.push(new PianoKey(i));
        }
        $.each([true, false], function(i, mode) {
                // draw white keys first, then black
                $.each(kbd.keys, function(i, e) {
                        if (e.white() == mode) {
                            e.init_svg(kbd.ctx);
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

function PianoRoll() {

}

function TrainingSession(canvas) {
    var trainer = this;

    this.tempo = 120; // quarter notes per minute
    this.clock = 0;
    this.last_started = null;

    this.keyboard = new Keyboard(canvas);
    this.pianoroll = null;

    this.tick = function() {
        console.log(this.keyboard.currently_pressed());
    }

    this.start = function() {
        var TICK = 1.; //0.01;
        //setInterval(function() { trainer.tick(); }, 1000. * TICK);
    }
}