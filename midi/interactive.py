from pygame import midi
import threading
import Queue

midi.init()

class MIDI(threading.Thread):
    def __init__(self, device_id):
        threading.Thread.__init__(self)
        self.input = midi.Input(device_id)
        self.q = Queue.Queue()

    def run(self):
        while True:
            buf = self.input.read(1)
            if buf:
                data, timestamp = buf[0]
                try:
                    state = {
                        144: 'on',
                        128: 'off',
                    }[data[0]]
                except KeyError:
                    continue
                note = data[1]
                print 'new event', state, note
                self.q.put({'state': state, 'note': note})

    def next_event(self):
        return self.q.get()
