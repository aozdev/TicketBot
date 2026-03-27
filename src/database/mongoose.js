const mongoose = require("mongoose");

const guildSettingsSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    panelTitle: { type: String, default: null },
    panelDescription: { type: String, default: null },
    panelFooter: { type: String, default: null },
    buttonLabel: { type: String, default: null },
    panelColor: { type: String, default: null },
    staffRoleId: { type: String, default: null },
    logChannelId: { type: String, default: null },
    categoryId: { type: String, default: null },
    panelChannelId: { type: String, default: null },
    panelMessageId: { type: String, default: null }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

const ticketSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, default: null },
    categoryId: { type: String, default: null },
    ownerId: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    sequence: { type: Number, required: true },
    displayId: { type: String, required: true },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    closedById: { type: String, default: null },
    status: {
      type: String,
      enum: ["open", "closed", "deleted"],
      default: "open",
      index: true
    },
    staffRoleId: { type: String, default: null },
    logChannelId: { type: String, default: null },
    rating: { type: Number, default: null },
    ratingFeedback: { type: String, default: null },
    ratedAt: { type: Date, default: null },
    closeReason: { type: String, default: null }
  },
  {
    versionKey: false
  }
);

ticketSchema.index(
  { guildId: 1, ownerId: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);
ticketSchema.index({ guildId: 1, sequence: 1 }, { unique: true });
ticketSchema.index({ channelId: 1 }, { unique: true, sparse: true });

const counterSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true, index: true },
    ticketCounter: { type: Number, default: 0 }
  },
  {
    versionKey: false
  }
);

const GuildSettings =
  mongoose.models.GuildSettings || mongoose.model("GuildSettings", guildSettingsSchema);
const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);
const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

let listenersBound = false;

function bindConnectionListeners() {
  if (listenersBound) {
    return;
  }

  mongoose.connection.on("connected", () => {
    console.log("[Database] Connected: MongoDB");
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[Database] Disconnected: MongoDB");
  });

  mongoose.connection.on("error", (error) => {
    console.error("[Database] Error:", error);
  });

  listenersBound = true;
}

function isValidDocumentId(documentId) {
  return mongoose.isValidObjectId(documentId);
}

async function connectDatabase(mongoUri) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  bindConnectionListeners();

  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 15000
  });

  return mongoose.connection;
}

async function getGuildSettings(guildId) {
  return GuildSettings.findOne({ guildId }).lean();
}

async function saveGuildSettings(guildId, settings) {
  const {
    _id,
    createdAt,
    updatedAt,
    guildId: ignoredGuildId,
    ...safeSettings
  } = settings ?? {};

  return GuildSettings.findOneAndUpdate(
    { guildId },
    { $set: { guildId, ...safeSettings } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, lean: true }
  );
}

async function getOpenTicketByUser(guildId, ownerId) {
  return Ticket.findOne({ guildId, ownerId, status: "open" }).lean();
}

async function getOpenTicketByChannel(channelId) {
  return Ticket.findOne({ channelId, status: "open" }).lean();
}

async function getClosedTicketById(ticketDocumentId) {
  if (!isValidDocumentId(ticketDocumentId)) {
    return null;
  }

  return Ticket.findOne({ _id: ticketDocumentId, status: "closed" }).lean();
}

async function getNextTicketSequence(guildId) {
  const counter = await Counter.findOneAndUpdate(
    { guildId },
    { $inc: { ticketCounter: 1 } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, lean: true }
  );

  return counter.ticketCounter;
}

async function createTicket(ticketData) {
  const ticket = await Ticket.create(ticketData);
  return ticket.toObject();
}

async function closeTicketByChannel(channelId, closedById, logChannelId) {
  return Ticket.findOneAndUpdate(
    { channelId, status: "open" },
    {
      $set: {
        status: "closed",
        closedAt: new Date(),
        closedById,
        logChannelId: logChannelId ?? null,
        closeReason: "closed"
      }
    },
    { returnDocument: "after", lean: true }
  );
}

async function markTicketAsDeleted(ticketDocumentId) {
  if (!isValidDocumentId(ticketDocumentId)) {
    return null;
  }

  return Ticket.findOneAndUpdate(
    { _id: ticketDocumentId, status: "open" },
    {
      $set: {
        status: "deleted",
        closedAt: new Date(),
        closeReason: "channel_missing"
      }
    },
    { returnDocument: "after", lean: true }
  );
}

async function saveTicketRating(ticketDocumentId, ownerId, rating, ratingFeedback = null) {
  if (!isValidDocumentId(ticketDocumentId)) {
    return null;
  }

  return Ticket.findOneAndUpdate(
    { _id: ticketDocumentId, ownerId, status: "closed" },
    {
      $set: {
        rating,
        ratingFeedback,
        ratedAt: new Date()
      }
    },
    { returnDocument: "after", lean: true }
  );
}

async function listTicketsByGuild(guildId) {
  return Ticket.find({ guildId }).lean();
}

async function resetGuildData(guildId) {
  const [ticketResult] = await Promise.all([
    Ticket.deleteMany({ guildId }),
    GuildSettings.deleteOne({ guildId }),
    Counter.deleteOne({ guildId }),
  ]);

  return {
    deletedTicketDocuments: ticketResult.deletedCount ?? 0
  };
}

async function countOpenTicketsByGuild(guildId) {
  return Ticket.countDocuments({ guildId, status: "open" });
}

async function countSolvedTickets() {
  return Ticket.countDocuments({ status: "closed" });
}

async function countSolvedTicketsByGuild(guildId) {
  return Ticket.countDocuments({ guildId, status: "closed" });
}

function isDuplicateKeyError(error) {
  return error?.name === "MongoServerError" && error?.code === 11000;
}

module.exports = {
  closeTicketByChannel,
  connectDatabase,
  countOpenTicketsByGuild,
  countSolvedTickets,
  countSolvedTicketsByGuild,
  createTicket,
  getClosedTicketById,
  getGuildSettings,
  getNextTicketSequence,
  getOpenTicketByChannel,
  getOpenTicketByUser,
  isDuplicateKeyError,
  listTicketsByGuild,
  markTicketAsDeleted,
  resetGuildData,
  saveGuildSettings,
  saveTicketRating
};

