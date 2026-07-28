// Server-owned streak calculation — mirrors the logic that used to live in the client's
// updateStreak.js, but keyed off the server's clock and only ever called from server code
// paths that represent genuine activity (progress complete, quiz submit), never from a
// route a client can invoke directly.
export async function bumpStreak(dbClient, userId) {
    const today = new Date().toISOString().slice(0, 10);

    const { rows } = await dbClient.query(
        'SELECT current_streak, longest_streak, last_study_date FROM profiles WHERE id = $1',
        [userId]
    );
    const profile = rows[0];
    if (!profile) return;

    if (profile.last_study_date === today) return; // already counted today

    const diffDays = profile.last_study_date
        ? Math.floor((new Date(today) - new Date(profile.last_study_date)) / 86400000)
        : null;

    let newStreak = profile.current_streak || 0;
    if (diffDays === null || diffDays > 1) newStreak = 1;
    else if (diffDays === 1) newStreak += 1;

    await dbClient.query(
        `UPDATE profiles SET current_streak = $1, longest_streak = $2, last_study_date = $3
         WHERE id = $4`,
        [newStreak, Math.max(newStreak, profile.longest_streak || 0), today, userId]
    );
}
