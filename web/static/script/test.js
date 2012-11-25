
var SCALE_OFFSET = [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6];
var SCALE_LEN = Math.ceil(SCALE_OFFSET[SCALE_OFFSET.length - 1] + .5);
var KEY0 = 21; // A
var FREQ0 = 440. / Math.pow(2., 4.); // 4 octaves below A440
var WIDTH_W = 30;

function Key(i) {
    this.i = i;

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
        this.svg.attr({fill: active ? 'orange' : this.default_color()});
    }

    this.init_svg = function(ctx) {
        var dim = this.dim();
        this.svg = ctx.rect(100 + this.center() * WIDTH_W - .5 * dim.width, 100, dim.width, dim.height)
        this.svg.attr({fill: this.default_color()});
        var key = this;
        this.svg.hover(function() {
                key.set_status(true);
            },
            function() {
                key.set_status(false);
            });
    }
}

function init_keyboard() {
    var paper = Raphael($('#canvas')[0]);

    var WIDTH_W = 30;
    var WIDTH_B = 15;

    var scale_offset = [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6];
    var scale_len = Math.ceil(scale_offset[scale_offset.length - 1] + .5);

    var keys = [];
    for (var i = 0; i < 88; i++) {
        keys.push(new Key(i));
    }
    $.each([true, false], function(i, mode) {
            // draw white keys first, then black
            $.each(keys, function(i, e) {
                    console.log(e, mode);
                    if (e.white() == mode) {
                        e.init_svg(paper);
                    }
                });
        });


    var conn = new WebSocket('ws://localhost:8000/socket');
    conn.onopen = function () {
        console.log('opened');
    };

// Log errors
    conn.onerror = function (error) {
        console.log('WebSocket Error ' + error);
    };

// Log messages from the server
    conn.onmessage = function (e) {
        var data = JSON.parse(e.data);
        console.log(data);
        var key = keys[data.note - KEY0];
        key.set_status(data.state == 'on');
    };
}

function init_pianoroll() {
    var paper = Raphael($('#canvas')[0]);

    var MODE = 'horiz';
    //var MODE = 'vert';

    $.get('/pianoroll', function(data) {
            $.each(data, function(k, v) {
                    $.each(v, function(i, e) {
                            var r;
                            if (MODE == 'horiz') {
                                var NOTE_SZ = 5;
                                var BEAT_SZ = 25;
                                r = paper.rect(e.beat * BEAT_SZ, (127 - e.note) * NOTE_SZ, e.duration * BEAT_SZ, NOTE_SZ);
                            } else {
                                var BEAT_SZ = 200;
                                var y = function(b) {
                                    return 950 - BEAT_SZ * (Math.log(b + 1) - Math.log(1.));
                                }

                                var NOTE_SZ = 1500 / 88.;
                                r = paper.rect((e.note - 9) * NOTE_SZ, y(e.beat + e.duration), NOTE_SZ, y(e.beat) - y(e.beat + e.duration));
                            }
                            r.attr({fill: '#ccf'});
                        });
                });
        });
}


