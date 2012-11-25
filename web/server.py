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
from midi import fileformat
from midi import interactive

def web_path(*args):
    return os.path.join(project_root, 'web', *args)

class PianoRollHandler(web.RequestHandler):
    def get(self):
        midi_dir = '/home/drew/midi'
        data = fileformat.load_midi(os.path.join(midi_dir, os.listdir(midi_dir)[0]))

        self.set_header('Content-Type', 'text/json')
        self.write(json.dumps(data))

class MainHandler(web.RequestHandler):
    def get(self):
        self.render('test.html', onload='init_keyboard')

class PianoRollPlaygroundHandler(web.RequestHandler):
    def get(self):
        self.render('test.html', onload='init_pianoroll')

class WebSocketTestHandler(websocket.WebSocketHandler):
    def initialize(self, midi):
        self.midi = midi
        self.terminate = False

    def open(self):
        print "WebSocket opened"

        import threading
        def run():
            while not self.terminate:
                evt = self.midi.next_event()
                print 'new event2', evt
                self.write_message(evt)
        threading.Thread(target=run).start()

    def on_message(self, message):
        print 'received', message
        #self.write_message(u"You said: " + message)

    def on_close(self):
        self.terminate = True
        print "WebSocket closed"

if __name__ == "__main__":

    parser = OptionParser()

    (options, args) = parser.parse_args()

    try:
        port = int(args[0])
    except IndexError:
        port = 8000
    ssl = None

    m = interactive.MIDI(3)
    m.start()

    application = web.Application([
        (r'/', MainHandler),
        (r'/pr', PianoRollPlaygroundHandler),
        (r'/pianoroll', PianoRollHandler),
        (r'/socket', WebSocketTestHandler, {'midi': m}),
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

    logging.info('shutting down...')
