### redis-semaphore@3.0.0

- **Breaking change:** `FairSemaphore` has been removed. Use `Semaphore` instead (has the same "fairness")
- Internal code has been cleaned up
- Added more test, include synthetic node unsynchroned clocks
