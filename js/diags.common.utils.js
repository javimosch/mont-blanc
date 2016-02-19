function normalizeOrderTime(t) {
    if (t.minutes > 0 && t.minutes < 15) {
        t.minutes = 15;
    }
    if (t.minutes > 15 && t.minutes < 30) {
        t.minutes = 30;
    }
    if (t.minutes > 30 && t.minutes < 45) {
        t.minutes = 45;
    }
    if (t.minutes > 45 && t.minutes < 59) {
        t.hours += 1;
        t.minutes = 0;
    }
    return t;
}
