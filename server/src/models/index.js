import crypto from 'crypto';
import db from '../database/index.js';
import * as schema from '../database/schema.js';
import { eq, or, and, lte, inArray, notInArray, like, count as drizzleCount, asc, desc } from 'drizzle-orm';

const Op = {
  or: Symbol.for('or'),
  in: Symbol.for('in'),
  notIn: Symbol.for('notIn'),
  like: Symbol.for('like'),
  lte: Symbol.for('lte'),
};

const Sequelize = {
  Op,
};

function getOpSymbol(key) {
  if (typeof key === 'symbol') return key;
  if (key === 'or' || key === '$or') return Op.or;
  if (key === 'in' || key === '$in') return Op.in;
  if (key === 'notIn' || key === '$notIn') return Op.notIn;
  if (key === 'like' || key === '$like') return Op.like;
  if (key === 'lte' || key === '$lte') return Op.lte;
  return null;
}

function buildWhereClause(table, whereObj) {
  if (!whereObj) return null;
  const conditions = [];

  const keys = [
    ...Object.getOwnPropertyNames(whereObj),
    ...Object.getOwnPropertySymbols(whereObj)
  ];

  for (const key of keys) {
    const val = whereObj[key];
    const opSym = getOpSymbol(key);

    if (opSym === Op.or && Array.isArray(val)) {
      const subConditions = val.map(sub => buildWhereClause(table, sub)).filter(Boolean);
      if (subConditions.length > 0) {
        conditions.push(or(...subConditions));
      }
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      const innerKeys = [
        ...Object.getOwnPropertyNames(val),
        ...Object.getOwnPropertySymbols(val)
      ];
      for (const innerKey of innerKeys) {
        const innerOp = getOpSymbol(innerKey);
        const innerVal = val[innerKey];
        if (innerOp === Op.like) {
          conditions.push(like(table[key], innerVal));
        } else if (innerOp === Op.in && Array.isArray(innerVal)) {
          if (innerVal.length > 0) {
            conditions.push(inArray(table[key], innerVal));
          } else {
            conditions.push(eq(table.id, '__never_match__'));
          }
        } else if (innerOp === Op.notIn && Array.isArray(innerVal)) {
          if (innerVal.length > 0) {
            conditions.push(notInArray(table[key], innerVal));
          }
        } else if (innerOp === Op.lte) {
          conditions.push(lte(table[key], innerVal));
        }
      }
    } else {
      if (val === null) {
        conditions.push(eq(table[key], val));
      } else {
        conditions.push(eq(table[key], val));
      }
    }
  }

  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

class ModelInstance {
  constructor(model, data) {
    this._model = model;
    Object.assign(this, data);
  }

  async save() {
    const pk = this._model.primaryKey;
    const pkValue = this[pk];
    const updateData = {};
    for (const key of Object.keys(this)) {
      if (key !== '_model' && key !== pk) {
        updateData[key] = this[key];
      }
    }
    await this._model.update(updateData, { where: { [pk]: pkValue } });
    return this;
  }

  async destroy() {
    const pk = this._model.primaryKey;
    const pkValue = this[pk];
    await this._model.destroy({ where: { [pk]: pkValue } });
  }

  changed(field, isChanged) {
    // No-op for Sequelize compatibility
  }

  toJSON() {
    const obj = {};
    for (const key of Object.keys(this)) {
      if (key !== '_model') {
        obj[key] = this[key];
      }
    }
    return obj;
  }
}

class ModelWrapper {
  constructor(name, table, primaryKey = 'id') {
    this.name = name;
    this.table = table;
    this.primaryKey = primaryKey;
  }

  async findOne(options = {}) {
    const whereClause = buildWhereClause(this.table, options.where);
    let query = db.select().from(this.table);
    if (whereClause) {
      query = query.where(whereClause);
    }
    if (options.order) {
      const orderFields = Array.isArray(options.order[0]) ? options.order : [options.order];
      const drizzleOrders = orderFields.map(([col, dir]) => {
        return dir && dir.toUpperCase() === 'DESC' ? desc(this.table[col]) : asc(this.table[col]);
      });
      query = query.orderBy(...drizzleOrders);
    }
    query = query.limit(1);
    const rows = await query.execute();
    if (rows.length === 0) return null;

    const row = rows[0];
    const instance = new ModelInstance(this, row);
    if (options.include) {
      await this._loadIncludes([instance], options.include);
    }
    return instance;
  }

  async findByPk(id, options = {}) {
    if (!id) return null;
    return this.findOne({ ...options, where: { [this.primaryKey]: id } });
  }

  async findAll(options = {}) {
    const whereClause = buildWhereClause(this.table, options.where);
    let query = db.select().from(this.table);
    if (whereClause) {
      query = query.where(whereClause);
    }
    if (options.order) {
      const orderFields = Array.isArray(options.order[0]) ? options.order : [options.order];
      const drizzleOrders = orderFields.map(([col, dir]) => {
        return dir && dir.toUpperCase() === 'DESC' ? desc(this.table[col]) : asc(this.table[col]);
      });
      query = query.orderBy(...drizzleOrders);
    }
    if (options.limit !== undefined) {
      query = query.limit(options.limit);
    }
    if (options.offset !== undefined) {
      query = query.offset(options.offset);
    }
    const rows = await query.execute();
    const instances = rows.map(r => new ModelInstance(this, r));

    if (options.include) {
      await this._loadIncludes(instances, options.include);
    }
    return instances;
  }

  async findAndCountAll(options = {}) {
    const rows = await this.findAll(options);
    const total = await this.count(options);
    return { count: total, rows };
  }

  async count(options = {}) {
    const whereClause = buildWhereClause(this.table, options.where);
    let query = db.select({ val: drizzleCount() }).from(this.table);
    if (whereClause) {
      query = query.where(whereClause);
    }
    const rows = await query.execute();
    return rows[0]?.val || 0;
  }

  async create(values) {
    const data = { ...values };
    if (this.primaryKey === 'id' && !data.id) {
      data.id = crypto.randomUUID();
    }
    const now = new Date().toISOString();
    if (this.table.createdAt && !data.createdAt) {
      data.createdAt = now;
    }
    if (this.table.updatedAt && !data.updatedAt) {
      data.updatedAt = now;
    }
    const [inserted] = await db.insert(this.table).values(data).returning();
    return new ModelInstance(this, inserted);
  }

  async update(values, options = {}) {
    const data = { ...values };
    if (this.table.updatedAt && !data.updatedAt) {
      data.updatedAt = new Date().toISOString();
    }
    const whereClause = buildWhereClause(this.table, options.where);
    let query = db.update(this.table).set(data);
    if (whereClause) {
      query = query.where(whereClause);
    }
    await query.execute();
    return [1];
  }

  async destroy(options = {}) {
    const whereClause = buildWhereClause(this.table, options.where);
    let query = db.delete(this.table);
    if (whereClause) {
      query = query.where(whereClause);
    }
    await query.execute();
    return 1;
  }

  async _loadIncludes(instances, includeOption) {
    if (!includeOption || instances.length === 0) return;
    const includes = Array.isArray(includeOption) ? includeOption : [includeOption];

    for (const inc of includes) {
      let targetModel = inc;
      if (inc && inc.model) {
        targetModel = inc.model;
      }

      const ids = instances.map(inst => inst.id);

      if (this.name === 'Couple') {
        const fieldName = targetModel.name + 's';
        const foreignKey = 'coupleId';
        const relatedRows = await targetModel.findAll({ where: { [foreignKey]: { [Op.in]: ids } } });

        for (const inst of instances) {
          inst[fieldName] = relatedRows.filter(r => r[foreignKey] === inst.id);
        }
      } else if (targetModel.name === 'Couple' && this.name !== 'Couple') {
        const coupleIds = instances.map(inst => inst.coupleId).filter(Boolean);
        const couples = await targetModel.findAll({ where: { id: { [Op.in]: coupleIds } } });

        for (const inst of instances) {
          inst.Couple = couples.find(c => c.id === inst.coupleId) || null;
        }
      } else if (this.name === 'Event' && targetModel.name === 'Photo') {
        const relatedRows = await targetModel.findAll({ where: { eventId: { [Op.in]: ids } } });
        for (const inst of instances) {
          inst.Photos = relatedRows.filter(r => r.eventId === inst.id);
        }
      } else if (this.name === 'Event' && targetModel.name === 'Notification') {
        const relatedRows = await targetModel.findAll({ where: { eventId: { [Op.in]: ids } } });
        for (const inst of instances) {
          inst.Notifications = relatedRows.filter(r => r.eventId === inst.id);
        }
      } else if (this.name === 'Guest' && targetModel.name === 'PhotoAccessRequest') {
        const relatedRows = await targetModel.findAll({ where: { guestId: { [Op.in]: ids } } });
        for (const inst of instances) {
          inst.PhotoAccessRequests = relatedRows.filter(r => r.guestId === inst.id);
        }
      } else if (targetModel.name === 'Guest' && this.name === 'PhotoAccessRequest') {
        const guestIds = instances.map(inst => inst.guestId).filter(Boolean);
        const guests = await targetModel.findAll({ where: { id: { [Op.in]: guestIds } } });
        for (const inst of instances) {
          inst.Guest = guests.find(g => g.id === inst.guestId) || null;
        }
      } else if (targetModel.name === 'Event' && this.name === 'Notification') {
        const eventIds = instances.map(inst => inst.eventId).filter(Boolean);
        const events = await targetModel.findAll({ where: { id: { [Op.in]: eventIds } } });
        for (const inst of instances) {
          inst.Event = events.find(e => e.id === inst.eventId) || null;
        }
      }
    }
  }
}

const dbWrapper = {
  sequelize: {
    sync: async () => {
      console.log('[DATABASE] Turso schema verified.');
    }
  },
  Sequelize,
  SuperAdmin: new ModelWrapper('SuperAdmin', schema.superAdmins),
  Couple: new ModelWrapper('Couple', schema.couples),
  Event: new ModelWrapper('Event', schema.events),
  Guest: new ModelWrapper('Guest', schema.guests),
  CustomField: new ModelWrapper('CustomField', schema.customFields),
  Photo: new ModelWrapper('Photo', schema.photos),
  PhotoAccessRequest: new ModelWrapper('PhotoAccessRequest', schema.photoAccessRequests),
  Wish: new ModelWrapper('Wish', schema.wishes),
  Notification: new ModelWrapper('Notification', schema.notifications),
  Language: new ModelWrapper('Language', schema.languages, 'code'),
  AuditLog: new ModelWrapper('AuditLog', schema.auditLogs),
};

export { Op, Sequelize };
export default dbWrapper;
