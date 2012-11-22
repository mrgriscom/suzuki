import midi
import itertools
import collections
import sys

def load_midi(path):
    m = midi.read_midifile(path)
    m.make_ticks_abs()

    # todo: split left-/right-hand tracks

    def relevant_event(evt):
        return isinstance(evt, (midi.NoteOnEvent, midi.NoteOffEvent))

    def parse_event(evt):
        beat = evt.tick / float(m.resolution)
        note, velocity = evt.data
        if isinstance(evt, midi.NoteOffEvent) or velocity == 0:
            state = 'off'
        else:
            state = 'on'
        return {'beat': beat, 'state': state, 'note': note}

    events = [parse_event(evt) for evt in itertools.chain(*m) if relevant_event(evt)]
    events_by_note = map_reduce(events, lambda e: [(e['note'], e)], lambda v: sorted(v, key=lambda e: e['beat']))
    return dict((note, list(note_stream(events))) for note, events in events_by_note.iteritems())

def note_stream(events_by_note):
    def _note_stream():
        start = [None] # workaround so var can be modified inside closure

        def emit(evt):
            e = {'beat': start[0], 'note': evt['note'], 'duration': evt['beat'] - start[0]}
            start[0] = None
            if e['duration'] == 0:
                warn('warning: zero-length note')
                return None
            return e

        for evt in events_by_note:
            if evt['state'] == 'on':
                if start[0] is not None:
                    warn('warning: duplicate on events %s %s %s' % (evt['note'], start[0], evt['beat']))
                    yield emit(evt) # close out previous note
                start[0] = evt['beat']
            else:
                if start[0] is None:
                    warn('warning: off event w/o on %s %s' % (evt['note'], evt['beat']))
                    continue # drop event
                yield emit(evt)
        if start[0] is not None:
            warn('warning: trailing on event')
            # drop

    for e in _note_stream():
        if e:
            yield e

def warn(msg):
    sys.stderr.write(msg + '\n')

def map_reduce(data, emitfunc=lambda rec: [(rec,)], reducefunc=lambda v: v):
    """perform a "map-reduce" on the data

    emitfunc(datum): return an iterable of key-value pairings as (key, value). alternatively, may
        simply emit (key,) (useful for reducefunc=len)
    reducefunc(values): applied to each list of values with the same key; defaults to just
        returning the list
    data: iterable of data to operate on
    """
    mapped = collections.defaultdict(list)
    for rec in data:
        for emission in emitfunc(rec):
            try:
                k, v = emission
            except ValueError:
                k, v = emission[0], None
            mapped[k].append(v)
    return dict((k, reducefunc(v)) for k, v in mapped.iteritems())






if __name__ == "__main__":
    result = load_midi(sys.argv[1])

    print result
    print len(result)
    print [(k, len(v)) for k, v in result.iteritems()]

    import Image, ImageDraw
    W, H = 12000, 1500
    img = Image.new('RGB', (W, H))

    def _(x, y):
        return (20 * x, H - 10 * y)

    draw = ImageDraw.Draw(img)
    for note, notes in result.iteritems():
        for n in notes:
            draw.rectangle((_(n['beat'], note), _(n['beat'] + n['duration'], note + 1)), '#fff')

    img.save('/tmp/pianoroll.png', "PNG")
