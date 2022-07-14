const firebase = require("firebase-admin");
const fs = require("fs");
const { resolve } = require("path");

class Database {
  constructor() {
    const serviceAccount = process.env.FIREBASE_CREDENTIALS;
    firebase.initializeApp({
      credential: firebase.credential.cert(JSON.parse(serviceAccount)),
      databaseURL: "https://role-bot-v2-default-rtdb.europe-west1.firebasedatabase.app/"
    });
    this.db = firebase.database();
    this.dbLocal = {};
  }

  clearLocalDb() {
    this.dbLocal = {};
  }

  /**
   *
   * @param {string} guildId
   * @param {string|undefined} memberId
   * @returns {firebase.database.Reference}
   */
  ref(guildId, memberId) {
    return memberId ? this.db.ref(`/${guildId}/${memberId}`) : this.db.ref(`/${guildId}`);
  }

  /**
   *
   * @param {string} guildId
   * @param {string} memberId
   * @param {string|null} field
   * @param {any | null} value
   * @returns
   */
  cacheLocalMemberData(guildId, memberId, field, value) {
    if (!memberId || !guildId) {
      console.warn("Invalid values for guildId or memberId");
      return;
    }
    if (!this.dbLocal[guildId]) this.dbLocal[guildId] = {};
    if (!value && value !== null) {
      console.warn(`Are you sure you want to set ${guildId}/${memberId}/${field} as ${value}?`);
      console.log("Use `null` to be explicit about it.");
    }

    if (memberId && !field) {
      this.dbLocal[guildId][memberId] = value;
      this.dbLocal[guildId][memberId].decayTimer = setTimeout(() => {
        delete this.dbLocal[guildId][memberId];
      }, 60 * 60 * 1000);
      return;
    }

    if (memberId && field) {
      if (!this.dbLocal[guildId][memberId]) {
        this.dbLocal[guildId][memberId] = {};
        this.dbLocal[guildId][memberId].decayTimer = setTimeout(() => {
          delete this.dbLocal[guildId][memberId];
        }, 60 * 60 * 1000);
      }
      this.dbLocal[guildId][memberId][field] = value;
      return;
    }
  }

  /**
   *
   * @param {string} guildId
   * @param {string|null} field
   * @param {any|null} value
   * @returns
   */
  cacheLocalGuildConfig(guildId, field, value) {
    if (!guildId) {
      console.warn("Invalid value for guildId");
      return;
    }
    if (!this.dbLocal[guildId]) this.dbLocal[guildId] = {};
    if (!value && value !== null) {
      console.warn(`Are you sure you want to set ${guildId}/${memberId}/${field} as ${value}?`);
      console.log("Use `null` to be explicit about it.");
    }

    if (!field) {
      this.dbLocal[guildId].config = value;
      return;
    }
    if (!this.dbLocal[guildId].config) this.dbLocal[guildId].config = {};
    this.dbLocal[guildId].config[field] = value;
  }

  /**
   *
   * @param {string} field
   * @return {boolean}
   */
  validateField(field) {
    return !field.includes("/");
  }

  /**
   *
   * @param {string} guildId
   * @param {string} memberId
   * @param {string|undefined} field
   * @returns {Promise<any, Error}
   */
  readMemberData(guildId, memberId, field) {
    if (!this.validateField(field)) return;
    return new Promise((resolve, reject) => {
      try {
        if (field ? this.dbLocal[guildId][memberId][field] : this.dbLocal[guildId][memberId]) {
          clearTimeout(this.dbLocal[guildId][memberId].decayTimer);
          this.dbLocal[guildId][memberId].decayTimer = setTimeout(() => delete this.dbLocal[guildId][memberId], 30 * 60 * 1000);
          resolve(field ? this.dbLocal[guildId][memberId][field] : this.dbLocal[guildId][memberId]);
        } else {
          throw new Error();
        }
      } catch (_) {
        const baseRef = this.ref(guildId, memberId);
        const ref = field ? baseRef.child(field) : baseRef;
        ref.once(
          "value",
          (snapshot) => {
            const val = snapshot.val();
            this.cacheLocalMemberData(guildId, memberId, field, val);
            resolve(val);
          },
          (err) => {
            console.error(`Error reading /${guildId}/${memberId}:\n ${err}`);
            reject(err);
          }
        );
      }
    });
  }

  /**
   *
   * @param {string} guildId
   * @param {string} memberId
   * @param {string|null} field
   * @param {any} value
   * @returns {Promise<void, Error>}
   */
  writeMemberData(guildId, memberId, field, value) {
    if (!this.validateField(field)) return;
    return new Promise((resolve, reject) => {
      const baseRef = this.ref(guildId, memberId);
      const ref = field ? baseRef.child(field) : baseRef;
      ref.set(value, (err) => {
        if (err) {
          reject(err);
        } else {
          this.cacheLocalMemberData(guildId, memberId, field, value);
          resolve();
        }
      });
    });
  }

  /**
   *
   * @param {string} guildId
   * @param {string} memberId
   * @returns {Promise<void>}
   */
  deleteMember(guildId, memberId) {
    const ref = this.ref(guildId, memberId);
    try {
      delete this.dbLocal[guildId][memberId];
    } catch (_) {}
    return ref.remove();
  }

  /**
   *
   * @param {string} guildId
   * @returns {Promise<any, Error>}
   */
  readGuildConfig(guildId) {
    return new Promise((resolve, reject) => {
      try {
        if (this.dbLocal[guildId].config) {
          resolve(this.dbLocal[guildId].config);
        } else {
          throw new Error();
        }
      } catch (_) {
        const ref = this.ref(guildId).child("config");
        ref.once(
          "value",
          (snapshot) => {
            const val = snapshot.val();
            this.cacheLocalGuildConfig(guildId, null, val);
            resolve(val);
          },
          (err) => reject(err)
        );
      }
    });
  }

  /**
   *
   * @param {string} guildId
   * @returns {Promise<any, Error>}
   */
  readGuildRoleConfig(guildId) {
    return new Promise((resolve, reject) => {
      try {
        if (this.dbLocal[guildId].config.roles) {
          resolve(this.dbLocal[guildId].config.roles);
        } else {
          throw new Error();
        }
      } catch (_) {
        const ref = this.ref(guildId).child("config/roles");
        ref.once(
          "value",
          (snapshot) => {
            const val = snapshot.val();
            this.cacheLocalGuildConfig(guildId, "roles", val);
            resolve(val);
          },
          (err) => reject(err)
        );
      }
    });
  }

  /**
   *
   * @param {string} guildId
   * @param {string|null} field
   * @param {any} value
   * @returns {Promise<void, Error>}
   */
  writeGuildRoleConfig(guildId, value) {
    return new Promise((resolve, reject) => {
      const ref = this.ref(guildId).child("config/roles");
      ref.set(value, (err) => {
        if (err) {
          reject(err);
        } else {
          this.cacheLocalGuildConfig(guildId, "roles", value);
          resolve();
        }
      });
    });
  }

  /**
   *
   * @param {string} guildId
   * @returns {Promise<any, Error>}
   */
  readMessagingChannel(guildId) {
    return new Promise((resolve, reject) => {
      try {
        if (this.dbLocal[guildId].config.messaging) {
          resolve(this.dbLocal[guildId].config.messaging);
        } else {
          throw new Error();
        }
      } catch (e) {
        const ref = this.ref(guildId).child("config/messaging");
        ref.once(
          "value",
          (snapshot) => {
            const val = snapshot.val();
            this.cacheLocalGuildConfig(guildId, "messaging", val);
            resolve(val);
          },
          (err) => reject(err)
        );
      }
    });
  }

  /**
   *
   * @param {string} guildId
   * @param {string} channel
   * @returns {Promise<void, Error>}
   */
  writeMessagingChannel(guildId, channel) {
    return new Promise((resolve, reject) => {
      const ref = this.ref(guildId).child("config/messaging");
      ref.set(channel, (err) => {
        if (err) {
          reject(err);
        } else {
          this.cacheLocalGuildConfig(guildId, "messaging", channel);
          resolve();
        }
      });
    });
  }

  /**
   *
   * @param {string} guildId
   * @returns {Promise<any, Error>}
   */
  readPointUnit(guildId) {
    return new Promise((resolve, _reject) => {
      const localPointUnit = process.env.POINT_UNIT;
      try {
        if (this.dbLocal[guildId].config.pointUnit) {
          resolve(this.dbLocal[guildId].config.pointUnit);
        } else {
          throw new Error();
        }
      } catch (e) {
        const ref = this.ref(guildId).child("config/pointUnit");
        ref.once(
          "value",
          (snapshot) => {
            const val = snapshot.val();
            if (val) this.cacheLocalGuildConfig(guildId, "pointUnit", val);
            resolve(val ? val : localPointUnit);
          },
          (err) => resolve(localPointUnit)
        );
      }
    });
  }

  /**
   *
   * @param {string} guildId
   * @param {string} unit
   * @returns {Promise<void, Error>}
   */
  writePointUnit(guildId, unit) {
    return new Promise((resolve, reject) => {
      const ref = this.ref(guildId).child("config/pointUnit");
      ref.set(unit, (err) => {
        if (err) {
          reject(err);
        } else {
          this.cacheLocalGuildConfig(guildId, "pointUnit", unit);
          resolve();
        }
      });
    });
  }

  /**
   *
   * @param {string} guildId
   * @returns {Promise<Object, Error>}
   */
  getGuildData(guildId) {
    return new Promise((resolve, reject) => {
      //no need to get from cache only called when needed
      const ref = this.ref(guildId);
      ref.once(
        "value",
        (snapthing) => {
          const guild = snapthing.val();
          this.dbLocal[guildId] = guild;
          resolve(guild);
        },
        (_error) => console.log("uhhh idk how databse works")
      );
    });
  }
}

module.exports = Database;
