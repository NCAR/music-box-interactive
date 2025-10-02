from enum import Enum


class RunStatus(Enum):
    RUNNING = 'RUNNING'
    WAITING = 'WAITING'
    NOT_FOUND = 'NOT_FOUND'
    DONE = 'DONE'
    ERROR = 'ERROR'
