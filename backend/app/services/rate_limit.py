"""Track failed logins in a rolling time window for this backend process."""

from collections import defaultdict, deque
from math import ceil
from threading import Lock
from time import monotonic
from typing import Callable


class LoginRateLimiter:
    """Small in-memory limiter for the single-process course backend."""

    def __init__(
        self,
        max_attempts: int,
        window_seconds: int,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._clock = clock
        self._attempts: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def retry_after(self, key: str) -> int | None:
        with self._lock:
            attempts = self._active_attempts(key)
            if len(attempts) < self.max_attempts:
                return None
            return max(1, ceil(self.window_seconds - (self._clock() - attempts[0])))

    def record_failure(self, key: str) -> None:
        with self._lock:
            attempts = self._active_attempts(key)
            attempts.append(self._clock())

    def reset(self, key: str) -> None:
        with self._lock:
            self._attempts.pop(key, None)

    def _active_attempts(self, key: str) -> deque[float]:
        """Discard failures older than the current window before counting them."""
        attempts = self._attempts[key]
        cutoff = self._clock() - self.window_seconds
        while attempts and attempts[0] <= cutoff:
            attempts.popleft()
        return attempts
