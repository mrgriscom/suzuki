
var SCALE_OFFSET = [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6];
var SCALE_LEN = Math.ceil(SCALE_OFFSET[SCALE_OFFSET.length - 1] + .5);
var KEY0 = 9; // A
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
        return SCALE_LEN * Math.floor(this.key() / SCALE_OFFSET.length) + this.offset() - SCALE_OFFSET[KEY0];
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

    this.init_svg = function(ctx) {
        var dim = this.dim();
        this.svg = ctx.rect(100 + this.center() * WIDTH_W - .5 * dim.width, 100, dim.width, dim.height)
        this.svg.attr({fill: this.default_color()});
        var key = this;
        this.svg.hover(function() {
                key.svg.attr({fill: 'orange'});
            },
            function() {
                key.svg.attr({fill: key.default_color()});
            });
    }
}

function init() {
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
            $.each(keys, function(i, e) {
                    console.log(e, mode);
                    if (e.white() == mode) {
                        e.init_svg(paper);
                    }
                });
        });


}



