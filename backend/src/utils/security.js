function failedLoginState(previousAttempts) {
    const attempts = Number(previousAttempts || 0) + 1;
    return {
        attempts: attempts >= 5 ? 0 : attempts,
        blockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null
    };
}

module.exports = { failedLoginState };
