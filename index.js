require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    REST,
    Routes,
    SlashCommandBuilder,
    Events
} = require("discord.js");
const fs = require("fs");
const http = require("http");

// ================= CONFIG & ENV =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PANEL_CHANNEL_ID = "1337266092812406844";
const STAFF_ROLE_ID = "1405179388223291552";
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL;
const GOODBYE_CHANNEL_ID = process.env.GOODBYE_CHANNEL;
const CLOSED_CATEGORY_ID = "1407037252609118328"; // Closed Tickets Category

// Log Channels
const LOG_CHANNELS = {
    MOD: process.env.MOD_LOGS,
    TICKET: process.env.TICKET_LOGS,
    MSG: process.env.MESSAGE_LOGS,
    VC: process.env.VC_LOGS,
    JOIN: process.env.JOIN_LEAVE_LOGS,
    ROLE: process.env.ROLE_LOGS,
    SERVER: process.env.SERVER_LOGS,
    INVITE: process.env.INVITE_LOGS,
    NICKNAME: process.env.NICKNAME_LOGS
};

// Categories
const CATEGORY_IDS = {
    purchase: "1477273688490381394",
    notreceived: "1477273792287084614",
    replacement: "1477273914928271391",
    other: "1477273728575475762",
    teamreg: "1494731948722098276"   // Team Registration Category
};

// Emojis
const EMOJIS = {
    purchase: "🛒",
    notreceived: "♻️",
    replacement: "🔁",
    other: "🌐",
    teamreg: "🏆"
};

// Data stores
let warnings = {};
let antiSpamChannels = new Set();
let antiLinkChannels = new Set();
let antiMentionChannels = new Set();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildModeration
    ],
    partials: [Partials.Channel, Partials.GuildMember, Partials.User],
});

// Helper Function
async function sendLog(guild, channelId, embed) {
    if (!channelId) return;
    const channel = guild.channels.cache.get(channelId);
    if (channel) channel.send({ embeds: [embed] }).catch(() => {});
}

// ================= COMMANDS REGISTRATION =================
const commands = [
    new SlashCommandBuilder().setName("ticketpanel").setDescription("Send ticket panel"),
    new SlashCommandBuilder().setName("ban").setDescription("Ban a user").addUserOption(o => o.setName("user").setDescription("User").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Reason")),
    new SlashCommandBuilder().setName("kick").setDescription("Kick a user").addUserOption(o => o.setName("user").setDescription("User").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Reason")),
    new SlashCommandBuilder().setName("mute").setDescription("Timeout a user").addUserOption(o => o.setName("user").setDescription("User").setRequired(true)).addIntegerOption(o => o.setName("minutes").setDescription("Minutes").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Reason")),
    new SlashCommandBuilder().setName("unmute").setDescription("Remove timeout").addUserOption(o => o.setName("user").setDescription("User").setRequired(true)),
    new SlashCommandBuilder().setName("warn").setDescription("Warn a user").addUserOption(o => o.setName("user").setDescription("User").setRequired(true)),
    new SlashCommandBuilder().setName("clear").setDescription("Clear messages").addIntegerOption(o => o.setName("amount").setDescription("Amount").setRequired(true)),
    new SlashCommandBuilder().setName("msg").setDescription("Send formatted embed message").addStringOption(o => o.setName("channel_id").setDescription("Channel ID").setRequired(true)),
    new SlashCommandBuilder().setName("tos").setDescription("Shows Terms of Service"),
    new SlashCommandBuilder().setName("rules").setDescription("Shows server rules"),
    new SlashCommandBuilder().setName("legit").setDescription("Send Legit Check Embed"),
    new SlashCommandBuilder().setName("antispam").setDescription("Toggle Anti-Spam"),
    new SlashCommandBuilder().setName("antilink").setDescription("Toggle Anti-Link"),
    new SlashCommandBuilder().setName("antimention").setDescription("Toggle Anti-Mass-Mention"),
].map(cmd => cmd.toJSON());

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log("Slash Commands Registered ✅");
    } catch (err) { console.error(err); }
});

// ================= INTERACTION HANDLER =================
client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const cmd = interaction.commandName;
            if (cmd === "ticketpanel") {
                if (interaction.channelId !== PANEL_CHANNEL_ID) return interaction.reply({ content: "Wrong channel ♻️", ephemeral: true });
                const embed = new EmbedBuilder().setTitle("TEC TRADER").setColor(0x2b2d31).setDescription("👋 **Welcome to TEC TRADER Support!**\nPlease select the appropriate ticket category below. 🎫\n\n📌 **Before opening a ticket:**\n• ✅ Make sure your issue has not already been resolved.\n• 🚫 Do not open multiple tickets for the same issue.\n• 📝 Provide clear and complete details.\n• ⏳ Be patient while waiting for support.");
                const select = new StringSelectMenuBuilder().setCustomId("ticket_select").setPlaceholder("🎟️ Select ticket type").addOptions(
                    { label: "🛒 Purchase", value: "purchase" },
                    { label: "🔁 Replacement", value: "replacement" },
                    { label: "♻️ Not Received", value: "notreceived" },
                    { label: "🌐 Other", value: "other" },
                    { label: "🏆 Team Registration", value: "teamreg" }
                );
                return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
            }
            // Baaki sab commands same rakhe gaye hain
            if (cmd === "kick") { /* ... same */ }
            if (cmd === "ban") { /* ... same */ }
            if (cmd === "mute") { /* ... same */ }
            if (cmd === "unmute") { /* ... same */ }
            if (cmd === "warn") { /* ... same */ }
            if (cmd === "clear") { /* ... same */ }
            if (cmd === "msg") { /* ... same */ }
            if (cmd === "legit") { /* ... same */ }
            if (["antispam", "antilink", "antimention"].includes(cmd)) { /* ... same */ }
        }

        // ===== MODAL SUBMIT HANDLER =====
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith("modal_msg_")) {
                const chanId = interaction.customId.replace("modal_msg_", "");
                const content = interaction.fields.getTextInputValue("msg_content");
                const channel = client.channels.cache.get(chanId);
                if (!channel) return interaction.reply({ content: "Invalid Channel ID", ephemeral: true });
                const embed = new EmbedBuilder().setColor("#8B0000").setDescription(content);
                await channel.send({ embeds: [embed] });
                const log = new EmbedBuilder().setColor("#8B0000").setTitle("Formatted Message Sent").addFields({ name: "Target Channel", value: `<#${chanId}>` }, { name: "Sender", value: interaction.user.tag }).setTimestamp();
                await sendLog(interaction.guild, LOG_CHANNELS.MOD, log);
                return interaction.reply({ content: "✅ Formatted message sent!", ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });
            const type = interaction.customId.replace("modal_", "");

            const ticketChannel = await interaction.guild.channels.create({
                name: `${EMOJIS[type] || "🏆"}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: CATEGORY_IDS[type] || CATEGORY_IDS.other,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                ],
            });

            let fields = [];

            if (type === "teamreg") {
                const teamName = interaction.fields.getTextInputValue("team_name");
                const p1Discord = interaction.fields.getTextInputValue("player1_discord");
                const p1Riot = interaction.fields.getTextInputValue("player1_riot");
                const p1Rank = interaction.fields.getTextInputValue("player1_rank");
                const remaining = interaction.fields.getTextInputValue("remaining_players");

                fields.push({ name: "Team Name", value: teamName });
                fields.push({ 
                    name: "Players", 
                    value: `Player 1: ${p1Discord} | ${p1Riot} | ${p1Rank}\n\n${remaining}` 
                });
            } else {
                interaction.fields.fields.forEach(f => {
                    fields.push({ name: f.customId.toUpperCase(), value: f.value || "N/A" });
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x2b2d31)
                .setTitle(`Ticket - ${interaction.user.username}`)
                .addFields(fields)
                .setFooter({ text: `Opened by ${interaction.user.tag}` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({
                content: `<@${interaction.user.id}> <@&${STAFF_ROLE_ID}>`,
                embeds: [embed],
                components: [row]
            });

            const log = new EmbedBuilder().setColor("#3498DB").setTitle("Ticket Created").addFields({ name: "User", value: interaction.user.tag }, { name: "Channel", value: `<#${ticketChannel.id}>` }, { name: "Type", value: type.toUpperCase() }).setTimestamp();
            await sendLog(interaction.guild, LOG_CHANNELS.TICKET, log);
            return interaction.editReply(`Ticket Created: ${ticketChannel}`);
        }

        // ===== TICKET SELECT MENU =====
        if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
            const type = interaction.values[0];
            const modal = new ModalBuilder().setCustomId(`modal_${type}`).setTitle(`${EMOJIS[type]} ${type.toUpperCase()} FORM`);

            if (type === "teamreg") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("team_name").setLabel("Team Name").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("player1_discord").setLabel("Player 1 Discord Name").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("player1_riot").setLabel("Player 1 Riot ID").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("player1_rank").setLabel("Player 1 Rank").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("remaining_players").setLabel("Baqi Players + Substitute").setStyle(TextInputStyle.Paragraph).setPlaceholder("Player 2: Discord | RiotID | Rank\nPlayer 3: ...\nSubstitute: ...").setRequired(true))
                );
            } else if (type === "purchase") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("product").setLabel("Product Name").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("payment").setLabel("Payment Method").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("details").setLabel("Extra Details").setStyle(TextInputStyle.Paragraph).setRequired(false))
                );
            } else if (type === "replacement") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("product").setLabel("Product Name").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("order").setLabel("Order ID").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("problem").setLabel("Problem Description").setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
            } else if (type === "notreceived") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("product").setLabel("Product Name").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("transaction").setLabel("Transaction ID").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("proof").setLabel("Proof Link").setStyle(TextInputStyle.Short).setRequired(false))
                );
            } else {
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("help").setLabel("How can we help?").setStyle(TextInputStyle.Paragraph).setRequired(true)));
            }
            return interaction.showModal(modal);
        }

        // ===== BUTTONS =====
        if (interaction.isButton()) {
            if (interaction.customId === "claim") {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff Only!", ephemeral: true });
                const log = new EmbedBuilder().setColor("#2ECC71").setTitle("Ticket Claimed").addFields({ name: "Channel", value: interaction.channel.name }, { name: "Staff Member", value: interaction.user.tag }).setTimestamp();
                await sendLog(interaction.guild, LOG_CHANNELS.TICKET, log);
                return interaction.reply(`Ticket claimed by <@${interaction.user.id}>`);
            }

            if (interaction.customId === "close") {
                // DM Transcript
                try {
                    const messages = await interaction.channel.messages.fetch({ limit: 100 });
                    let transcript = `Transcript for: ${interaction.channel.name}\nGenerated: ${new Date().toLocaleString()}\n\n`;
                    messages.reverse().forEach(m => {
                        transcript += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
                    });
                    const buffer = Buffer.from(transcript, "utf-8");
                    await interaction.user.send({
                        content: `📄 **Your Ticket Transcript** - ${interaction.channel.name}`,
                        files: [{ attachment: buffer, name: `transcript-${interaction.channel.name}.txt` }]
                    });
                } catch (e) {
                    console.log("DM not sent");
                }

                // Move to Closed Category
                await interaction.channel.setParent(CLOSED_CATEGORY_ID).catch(() => {});
                await interaction.channel.setName(`closed-${interaction.channel.name}`);

                const log = new EmbedBuilder().setColor("#E74C3C").setTitle("Ticket Closed").addFields({ name: "Channel", value: interaction.channel.name }, { name: "Closed By", value: interaction.user.tag }).setTimestamp();
                await sendLog(interaction.guild, LOG_CHANNELS.TICKET, log);

                const reopenRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("reopen").setLabel("Reopen").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("delete").setLabel("Delete").setStyle(ButtonStyle.Danger)
                );
                return interaction.reply({ content: "Ticket Closed. ✅ Transcript sent to DM & moved to closed category.", components: [reopenRow] });
            }

            if (interaction.customId === "reopen") {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff Only!", ephemeral: true });
                const originalName = interaction.channel.name.replace("closed-", "");
                await interaction.channel.setName(originalName);
                await interaction.channel.setParent(CATEGORY_IDS.other).catch(() => {});
                const log = new EmbedBuilder().setColor("#2ECC71").setTitle("Ticket Reopened").addFields({ name: "Channel", value: interaction.channel.name }, { name: "Reopened By", value: interaction.user.tag }).setTimestamp();
                await sendLog(interaction.guild, LOG_CHANNELS.TICKET, log);
                return interaction.reply("Ticket Reopened!");
            }

            if (interaction.customId === "delete") {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff Only!", ephemeral: true });
                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                let transcript = `Transcript for: ${interaction.channel.name}\nGenerated: ${new Date().toLocaleString()}\n\n`;
                messages.reverse().forEach(m => {
                    transcript += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
                });
                const buffer = Buffer.from(transcript, "utf-8");
                const log = new EmbedBuilder().setColor("#000000").setTitle("Ticket Deleted").addFields({ name: "Channel", value: interaction.channel.name }, { name: "Deleted By", value: interaction.user.tag }).setTimestamp();
                const ticketLogChan = interaction.guild.channels.cache.get(LOG_CHANNELS.TICKET);
                if (ticketLogChan) {
                    await ticketLogChan.send({ embeds: [log], files: [{ attachment: buffer, name: `transcript-${interaction.channel.id}.txt` }] });
                }
                return interaction.channel.delete();
            }
        }
    } catch (err) { 
        console.error(err); 
    }
});

// ================= Baaki sab events same rakhe gaye hain (Role, Server, Message, VC, Join/Leave) =================
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    // ... your original code
});
client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
    // ... your original code
});
client.on(Events.InviteCreate, async (invite) => {
    // ... your original code
});
client.on("messageDelete", async (message) => {
    // ... your original code
});
client.on("messageUpdate", async (oldMsg, newMsg) => {
    // ... your original code
});
client.on("messageCreate", async (message) => {
    // ... your original code
});
client.on("voiceStateUpdate", async (oldState, newState) => {
    // ... your original code
});
client.on('guildMemberAdd', async member => {
    // ... your original code
});
client.on('guildMemberRemove', async member => {
    // ... your original code
});

client.login(TOKEN);
