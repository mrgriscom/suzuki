
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

function PianoKey(i, get_beat) {
    this.i = i;
    this.pressed = false;
    this.expected = false;
    this.last_on = null;
    //this.cb = function(status) {};

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

    this.set_pressed = function(pressed) {
        this.pressed = pressed;
        if (pressed) {
            this.last_on = get_beat();
        }
        this.refresh();
    }

    this.set_expected = function(expected) {
        this.expected = expected;
        this.refresh();
    }

    this.refresh = function() {
        var color;
        if (this.pressed && this.expected) {
            color = '#0f0';
        } else if (this.pressed && !this.expected) {
            color = '#f88';
        } else if (this.expected && !this.pressed) {
            color = 'orange';
        } else {
            color = this.default_color();
        }
        this.$svg.attr({fill: color});
    }

    this.init_svg = function(ctx, frame) {
        var dim = this.dim();
        this.svg = ctx.rect(frame, this.center() + .5 - .5 * dim.width, KEY_ASPECT - dim.height, dim.width, dim.height);
        this.$svg = $(this.svg);
        this.$svg.attr({fill: this.default_color(), stroke: 'black', 'stroke-width': .05});
        var key = this;
        /*
        this.$svg.hover(function() {
                key.set_status(true);
                key.cb(true);
            },
            function() {
                key.set_status(false);
                key.cb(false);
            });
        */
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

function Keyboard(ctx, frame, get_beat) {
    var kbd = this;

    this.ctx = ctx;

    this.init = function() {
        this.frame = this.ctx.group(frame, {transform: 'scale(' + 1/NUM_WHITE_KEYS + ')'});
    
        this.keys = [];
        for (var i = 0; i < TOTAL_KEYS; i++) {
            this.keys.push(new PianoKey(i, get_beat));
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
            /*
            $.each(kbd.keys, function(i, e) {
                    e.cb = function(status) {
                        kbd.conn.send(JSON.stringify({status: status ? 'on' : 'off', note: this.key()}));
                    };
                });
            */
        };
        this.conn.onerror = function (error) {
            console.log('websocket error ' + error);
        };
        this.conn.onmessage = function (e) {
            var data = JSON.parse(e.data);
            $.each(data, function(i, evt) {
                    var key = kbd.keys[evt.note - KEY0];
                    key.set_pressed(evt.state == 'on');
                });
        };
    }

    this.currently_pressed = function() {
        var pressed = {};
        $.each(this.keys, function(i, e) {
                if (e.pressed) {
                    pressed[e.i + KEY0] = e.last_on;
                }
            });
        return pressed;
    }

    this.set_expected = function(exp) {
        $.each(this.keys, function(i, e) {
                e.set_expected(false);
            });
        $.each(exp, function(k, v) {
                kbd.keys[+k - KEY0].set_expected(true);
            });
    }

    this.init();
}

function PianoRoll(ctx, frame, data) {
    var pr = this;

    this.init = function() {
        var g = ctx.group(frame, {
                transform: 'translate(0,' + (KEY_ASPECT/NUM_WHITE_KEYS) + ') scale(' + 1/TOTAL_KEYS + ')',
                stroke: 'black',
                'stroke-width': .05
            });
        this.pane = ctx.group(g);

        $.each(data, function(k, v) {
                $.each(v, function(i, e) {
                        var white = new PianoKey(e.note - KEY0).white();
                        var BLACK_MARGIN = 0.2;
                        var r = ctx.rect(pr.pane, e.note - KEY0 + (white ? 0. : BLACK_MARGIN), BEAT_SZ * e.beat, 1. - (white ? 0. : 2*BLACK_MARGIN), BEAT_SZ * e.duration, {
                                fill: (white ? '#ccf' : '#88b'),
                                //fill: (white ? '#fcf' : '#b8b'),
                            });
                    });
            });
    }

    this.set_time = function(t) {
        $(this.pane).attr('transform', 'translate(0, ' + -BEAT_SZ*t + ')');
    }

    this.expected = function(t) {
        var exp = {};
        $.each(data, function(k, v) {
                $.each(v, function(i, e) {
                        if (e.beat <= t && t < e.beat + e.duration) {
                            exp[e.note] = e.beat;
                        }
                    });
            });
        return exp;
    }

    this.init();
}

function TrainingSession(ctx, data) {
    var trainer = this;

    this.tempo = 40; // quarter notes per minute
    this.cur_beat = 0.;
    this.cur_clock = 0.;

    this.init = function() {
        var w = $('#canvas').width();
        var h = $('#canvas').height();
        var g = ctx.group({transform: 'scale(' + w + ',' + -w + ') translate(0,' + (-h/w) + ')'});

        this.pianoroll = new PianoRoll(ctx, g, data);
        this.keyboard = new Keyboard(ctx, g, function() { return trainer.cur_beat; });
    }

    this.tick = function(t) {
        var pressed = this.keyboard.currently_pressed();
        var expected = this.pianoroll.expected(this.cur_beat);

        this.keyboard.set_expected(expected);
        this.pianoroll.set_time(this.cur_beat);

        var correct = this.correct_keys(pressed, expected);
        if (correct) {
            this.cur_beat += (t - this.cur_clock) / 60. * this.tempo;
        }
        this.cur_clock = t;
    }

    this.correct_keys = function(pressed, expected) {
        var _pressed = [];
        var _expected = [];
        $.each(pressed, function(k, v) {
                _pressed.push(+k);
            });
        $.each(expected, function(k, v) {
                _expected.push(+k);
            });
        _pressed = _.sortBy(_pressed, function(i) { return i; });
        _expected = _.sortBy(_expected, function(i) { return i; });
        if (_pressed.length == _expected.length) {
            for (var i = 0; i < _pressed.length; i++) {
                if (_pressed[i] != _expected[i]) {
                    return false;
                }
                var last_pressed = pressed[_pressed[i]];
                var last_expected = expected[_expected[i]];
                if (last_pressed < last_expected) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    };

    this.start = function() {
        var TICK = 0.01;
        var t0 = clock();
        setInterval(function() {
                trainer.tick(clock() - t0);
            }, 1000. * TICK);
    }

    this.init();
}