import sys
import os.path

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from tornado.ioloop import IOLoop
import tornado.web as web
import tornado.gen as gen
from tornado.template import Template
import tornado.websocket as websocket
from optparse import OptionParser
import logging
import json
from midiutil import fileformat
from midiutil import interactive

MIDI_DIR = '/home/drew/midi'

def web_path(*args):
    return os.path.join(project_root, 'web', *args)

def load_midi(title):
    # os.path.join is a security hole
    return json.dumps(fileformat.load_midi(os.path.join(MIDI_DIR, '%s.mid' % title)))

class PianoRollHandler(web.RequestHandler):
    def get(self):
        self.set_header('Content-Type', 'text/json')
        self.write(load_midi(self.get_argument('title')))

class MIDIListHandler(web.RequestHandler):
    def get(self):
        midis = sorted([k[:-4] for k in os.listdir(MIDI_DIR) if k.endswith('.mid')])
        self.render('midilist.html', midis=midis)

class MainHandler(web.RequestHandler):
    def get(self):
        self.render('test.html', onload='init_keyboard', midi=load_midi(self.get_argument('title')))

class PianoRollPlaygroundHandler(web.RequestHandler):
    def get(self):
        self.render('test.html', onload='init_pianoroll')

class WebSocketTestHandler(websocket.WebSocketHandler):
    def initialize(self, midi):
        self.midi = midi

    def open(self):
        self.midi.subscribe(self)

    def on_message(self, message):
        data = json.loads(message)
        func = {
            'on': lambda o, note: o.note_on(note, velocity=100),
            'off': lambda o, note: o.note_off(note)
        }[data['status']]
        self.midi.do_action(lambda o: func(o, data['note']))

    def on_close(self):
        self.midi.unsubscribe(self)

    def received(self, data):
        self.write_message(json.dumps(data))

if __name__ == "__main__":

    parser = OptionParser()

    (options, args) = parser.parse_args()

    try:
        port = int(args[0])
    except IndexError:
        port = 8000
    ssl = None

    try:
        device = interactive.MIDIDevice('RD MIDI 1')
    except IOError:
        device = interactive.MockDevice()
        print 'using mock device'
    device.start()

    application = web.Application([
        (r'/', MIDIListHandler),
        (r'/train', MainHandler),
        (r'/pr', PianoRollPlaygroundHandler),
        (r'/pianoroll', PianoRollHandler),
        (r'/socket', WebSocketTestHandler, {'midi': device}),
        (r'/(.*)', web.StaticFileHandler, {'path': web_path('static')}),
    ], template_path=web_path('templates'))
    application.listen(port, ssl_options=ssl)

    try:
        IOLoop.instance().start()
    except KeyboardInterrupt:
        pass
    except Exception, e:
        print e
        raise

    device.terminate()
    logging.info('shutting down...')
