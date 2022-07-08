const Database = require("./database");

class PointsManager {
    /**
     *
     * @param {Database} db
     */
    constructor(db) {
        this.db = db;
        this.newPoints = {};
    }

    async updatePoints() {
        for (const guildId of Object.keys(this.newPoints)) {
            for (const memberId of Object.keys(this.newPoints[guildId])) {
                await this.db
                    .writeMemberData(
                        guildId,
                        memberId,
                        "points",
                        this.newPoints[guildId][memberId]
                    )
                    .catch((e) => console.error(e));
            }
            this.newPoints[guildId] = {};
        }
    }

    startPointUpdationLoop(interval) {
        return setInterval(async () => {
            await this.updatePoints();
        }, interval);
    }

    setPoints(guildId, memberId, points) {
        if (!this.newPoints[guildId]) this.newPoints[guildId] = {};
        if (this.newPoints[guildId][memberId]) return;
        this.newPoints[guildId][memberId] = points;
    }
}

module.exports = PointsManager;
