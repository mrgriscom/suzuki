import sys
import os.path

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from tornado.ioloop import IOLoop
import tornado.web as web
import tornado.gen as gen
from tornado.template import Template
from optparse import OptionParser
import logging
import json
import suzuki

def web_path(*args):
    return os.path.join(project_root, 'web', *args)

class PianoRollHandler(web.RequestHandler):
    def get(self):
        midi_dir = '/home/drew/midi'
        data = suzuki.load_midi(os.path.join(midi_dir, os.listdir(midi_dir)[0]))

        self.set_header('Content-Type', 'text/json')
        self.write(json.dumps(data))

class MainHandler(web.RequestHandler):
    def get(self):
        self.render('test.html', onload='init_keyboard')

class PianoRollPlaygroundHandler(web.RequestHandler):
    def get(self):
        self.render('test.html', onload='init_pianoroll')

if __name__ == "__main__":

    parser = OptionParser()

    (options, args) = parser.parse_args()

    try:
        port = int(args[0])
    except IndexError:
        port = 8000
    ssl = None

    application = web.Application([
        (r'/', MainHandler),
        (r'/pr', PianoRollPlaygroundHandler),
        (r'/pianoroll', PianoRollHandler),
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
