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
const CLOSED_CATEGORY_ID = "1407037252609118328";
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
    teamreg: "1494731948722098276"
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
// Get Ticket Creator
async function getTicketCreator(channel) {
    const overwrites = channel.permissionOverwrites.cache;
    for (const [, overwrite] of overwrites) {
        if (overwrite.type === 1 && overwrite.id !== STAFF_ROLE_ID && overwrite.allow.has(PermissionsBitField.Flags.ViewChannel)) {
            try {
                return await channel.guild.members.fetch(overwrite.id);
            } catch (e) {}
        }
    }
    return null;
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
            if (cmd === "kick") {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return interaction.reply({ content: "No Permission!", ephemeral: true });
                const target = interaction.options.getMember("user");
                const reason = interaction.options.getString("reason") || "No reason";
                await target.kick(reason);
                const log = new EmbedBuilder().setColor("#FFA500").setTitle("Member Kicked").addFields({ name: "Target", value: target.user.tag }, { name: "Moderator", value: interaction.user.tag }, { name: "Reason", value: reason }).setTimestamp();
                await sendLog(interaction.guild, LOG_CHANNELS.MOD, log);
                return interaction.reply(`✅ Kicked ${target.user.tag}`);
            }
            if (cmd === "ban") {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: "No Permission!", ephemeral: true });
                const target = interaction.options.getMember("user");
                const reason = interaction.options.getString("reason") || "No reason";
                await target.ban({ reason });
                const log = new EmbedBuilder().setColor("#FF0000").setTitle("Member Banned").addFields({ name: "Target", value: target.user.tag }, { name: "Moderator", value: interaction.user.tag }, { name: "Reason", value: reason }).setTimestamp();
                await sendLog(interaction.guild, LOG_CHANNELS.MOD, log);
                return interaction.reply(`✅ Banned ${target.user.tag}`);
            }
            if (cmd === "mute") {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return interaction.reply({ content: "No Permission!", ephemeral: true });
                const target = interaction.options.getMember("user");
                const mins = interaction.options.getInteger("minutes");
                const reason = interaction.options.getString("reason") || "No reason";
                await target.timeout(mins * 60000, reason);
                const log = new EmbedBuilder().setColor("#E67E22").setTitle("Member Muted (Timeout)").addFields({ name: "Target", value: target.user.tag }, { name: "Duration", value: `${mins} mins` }, { name: "Moderator", value: interaction.user.tag }).setTimestamp();
                await sendLog(interaction.guild, LOG_CHANNELS.MOD, log);
                return interaction.reply(`✅ Muted ${target.user.tag} for ${mins}m`);
            }
            if (cmd === "unmute") {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return interaction.reply({ content: "No Permission!", ephemeral: true });
                const target = interaction.options.getMember("user");
                await target.timeout(null);
                const log = new EmbedBuilder().setColor("#2ECC71").setTitle("Member Unmuted").addFields({ name: "Target", value: target.user.tag }, { name: "Moderator", value: interaction.user.tag }).setTimestamp();
                await sendLog(interaction.guild, LOG_CHANNELS.MOD, log);
                return interaction.reply(`✅ Unmuted ${target.user.tag}`);
            }
            if (cmd === "warn") {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return interaction.reply({ content: "No Permission!", ephemeral: true });
                const target = interaction.options.getMember("user");
                const key = `${interaction.guild.id}-${target.id}`;
                if (!warnings[key]) warnings[key] = [];
                warnings[key].push(Date.now());
                const log = new EmbedBuilder().setColor("#F1C40F").setTitle("Warning Issued").addFields({ name: "Target", value: target.user.tag }, { name: "Moderator", value: interaction.user.tag }, { name: "Total Warns", value: `${warnings[key].length}` }).setTimestamp();
                await sendLog(interaction.guild, LOG_CHANNELS.MOD, log);
                return interaction.reply(`⚠️ Warned ${target.user.tag}. Total warnings: ${warnings[key].length}`);
            }
            if (cmd === "clear") {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: "No Permission!", ephemeral: true });
                const amount = interaction.options.getInteger("amount");
                await interaction.channel.bulkDelete(amount, true);
                const log = new EmbedBuilder().setColor("#34495E").setTitle("Messages Cleared").addFields({ name: "Channel", value: `<#${interaction.channel.id}>` }, { name: "Amount", value: `${amount}` }, { name: "Moderator", value: interaction.user.tag }).setTimestamp();
                await sendLog(interaction.guild, LOG_CHANNELS.MOD, log);
                return interaction.reply({ content: `✅ Deleted ${amount} messages`, ephemeral: true });
            }
            if (cmd === "msg") {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: "No Permission!", ephemeral: true });
                const chanId = interaction.options.getString("channel_id");
                const modal = new ModalBuilder().setCustomId(`modal_msg_${chanId}`).setTitle("Send Formatted Embed");
                const input = new TextInputBuilder().setCustomId("msg_content").setLabel("Message Content").setStyle(TextInputStyle.Paragraph).setPlaceholder("Yahan apna formatted text paste karein...").setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return interaction.showModal(modal);
            }
            if (cmd === "legit") {
                const embed = new EmbedBuilder().setColor("#8B0000").setTitle("Tec Trader - Embed").setDescription("**Are we Legit?**\n\n✅ = Yes\n❌ = Without Proof = Ban").setFooter({ text: "Developed by @BAASHAA • 3/10/2026" }).setTimestamp();
                await interaction.channel.send({ embeds: [embed] });
                return interaction.reply({ content: "✅ Sent!", ephemeral: true });
            }
            if (["antispam", "antilink", "antimention"].includes(cmd)) {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: "No Permission!", ephemeral: true });
                let status;
                if (cmd === "antispam") antiSpamChannels.has(interaction.channel.id) ? (antiSpamChannels.delete(interaction.channel.id), status = "disabled") : (antiSpamChannels.add(interaction.channel.id), status = "enabled");
                if (cmd === "antilink") antiLinkChannels.has(interaction.channel.id) ? (antiLinkChannels.delete(interaction.channel.id), status = "disabled") : (antiLinkChannels.add(interaction.channel.id), status = "enabled");
                if (cmd === "antimention") antiMentionChannels.has(interaction.channel.id) ? (antiMentionChannels.delete(interaction.channel.id), status = "disabled") : (antiMentionChannels.add(interaction.channel.id), status = "enabled");
                return interaction.reply({ content: `✅ ${cmd} is now **${status}**`, ephemeral: true });
            }
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
                const discord = interaction.fields.getTextInputValue("players_discord");   // Fixed
                const riot = interaction.fields.getTextInputValue("players_riot");         // Fixed
                const rank = interaction.fields.getTextInputValue("players_rank");         // Fixed
                fields = [
                    { name: "Team Name", value: `\`\`\`${teamName}\`\`\`` },
                    { name: "Player Discord Username", value: `\`\`\`${discord}\`\`\`` },
                    { name: "Player Riot ID", value: `\`\`\`${riot}\`\`\`` },
                    { name: "Player Ranks", value: `\`\`\`${rank}\`\`\`` }
                ];
            } else {
                interaction.fields.fields.forEach(f => {
                    fields.push({ name: f.customId.toUpperCase().replace(/_/g, " "), value: `\`\`\`${f.value || "N/A"}\`\`\`` });
                });
            }
            const embed = new EmbedBuilder()
                .setColor(0x2b2d31)
                .setTitle(`Ticket - ${interaction.user.username}`)
                .addFields(fields)
                .setFooter({ text: `Opened by ${interaction.user.tag}` })
                .setTimestamp();
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger)
            );
           await ticketChannel.send({
    content: `<@${interaction.user.id}> <@&${STAFF_ROLE_ID}>\n\n**Your Ticket Is Opened, The Staff Team Will Assist You As Soon as Possible, Till Then Please Wait! <3**`,
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
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("players_discord").setLabel("Players Discord Username").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("players_riot").setLabel("Players Riot ID").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("players_rank").setLabel("Players Ranks").setStyle(TextInputStyle.Short).setRequired(true))
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
                const creator = await getTicketCreator(interaction.channel);
                if (creator) {
                    try {
                        const messages = await interaction.channel.messages.fetch({ limit: 100 });
                        let transcript = `Transcript for: ${interaction.channel.name}\nGenerated: ${new Date().toLocaleString()}\n\n`;
                        messages.reverse().forEach(m => {
                            transcript += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
                        });
                        const buffer = Buffer.from(transcript, "utf-8");
                        await creator.send({
                            content: `📄 **Your Ticket Transcript** - ${interaction.channel.name}`,
                            files: [{ attachment: buffer, name: `transcript-${interaction.channel.name}.txt` }]
                        });
                    } catch (e) {
                        console.log("Could not send DM to ticket creator");
                    }
                }
                await interaction.channel.setParent(CLOSED_CATEGORY_ID).catch(() => {});
                await interaction.channel.setName(`closed-${interaction.channel.name}`);
                const log = new EmbedBuilder().setColor("#E74C3C").setTitle("Ticket Closed").addFields({ name: "Channel", value: interaction.channel.name }, { name: "Closed By", value: interaction.user.tag }).setTimestamp();
                await sendLog(interaction.guild, LOG_CHANNELS.TICKET, log);
                const reopenRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("reopen").setLabel("Reopen").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("delete").setLabel("Delete").setStyle(ButtonStyle.Danger)
                );
                return interaction.reply({ content: "Ticket Closed. ✅ Transcript sent to opener's DM.", components: [reopenRow] });
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
                if (ticketLogChan) await ticketLogChan.send({ embeds: [log], files: [{ attachment: buffer, name: `transcript-${interaction.channel.id}.txt` }] });
                return interaction.channel.delete();
            }
        }
    } catch (err) {
        console.error(err);
    }
});
// ================= ALL OTHER EVENTS =================
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    if (oldRoles.size !== newRoles.size) {
        const added = newRoles.filter(r => !oldRoles.has(r.id)).first();
        const removed = oldRoles.filter(r => !newRoles.has(r.id)).first();
        let embed = new EmbedBuilder().setColor("#5865F2").setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() }).setTimestamp();
        if (added) embed.setTitle("Role Added").setDescription(`Added **${added.name}** to ${newMember.user}`);
        if (removed) embed.setTitle("Role Removed").setDescription(`Removed **${removed.name}** from ${newMember.user}`);
        await sendLog(newMember.guild, LOG_CHANNELS.ROLE, embed);
    }
    if (oldMember.nickname !== newMember.nickname) {
        const embed = new EmbedBuilder()
            .setColor("#E91E63")
            .setTitle("Nickname Changed")
            .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
            .addFields({ name: "Old Nickname", value: oldMember.nickname || "None", inline: true }, { name: "New Nickname", value: newMember.nickname || "None", inline: true })
            .setTimestamp();
        await sendLog(newMember.guild, LOG_CHANNELS.NICKNAME, embed);
    }
});
client.on(Events.GuildUpdate, async (oldGuild, newGuild) => {
    const embed = new EmbedBuilder().setColor("#F1C40F").setTitle("Server Updated").setTimestamp();
    if (oldGuild.name !== newGuild.name) embed.addFields({ name: "Name Changed", value: `${oldGuild.name} ➡️ ${newGuild.name}` });
    if (oldGuild.icon !== newGuild.icon) embed.addFields({ name: "Icon Changed", value: "Server icon was updated." });
    await sendLog(newGuild, LOG_CHANNELS.SERVER, embed);
});
client.on(Events.InviteCreate, async (invite) => {
    const embed = new EmbedBuilder()
        .setColor("#2ECC71")
        .setTitle("Invite Link Created")
        .addFields({ name: "Code", value: invite.code, inline: true }, { name: "Creator", value: invite.inviter?.tag || "Unknown", inline: true }, { name: "Channel", value: `<#${invite.channelId}>`, inline: true })
        .setTimestamp();
    await sendLog(invite.guild, LOG_CHANNELS.INVITE, embed);
});
client.on("messageDelete", async (message) => {
    if (message.author?.bot || !message.guild) return;
    const log = new EmbedBuilder().setColor("#E74C3C").setTitle("Message Deleted").addFields({ name: "Author", value: message.author.tag }, { name: "Channel", value: `<#${message.channel.id}>` }, { name: "Content", value: message.content || "No Content (Embed/File)" }).setTimestamp();
    await sendLog(message.guild, LOG_CHANNELS.MSG, log);
});
client.on("messageUpdate", async (oldMsg, newMsg) => {
    if (oldMsg.author?.bot || oldMsg.content === newMsg.content) return;
    const log = new EmbedBuilder().setColor("#F1C40F").setTitle("Message Edited").addFields({ name: "Author", value: oldMsg.author.tag }, { name: "Channel", value: `<#${oldMsg.channel.id}>` }, { name: "Before", value: oldMsg.content || "None" }, { name: "After", value: newMsg.content || "None" }).setTimestamp();
    await sendLog(oldMsg.guild, LOG_CHANNELS.MSG, log);
});
client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    if (antiLinkChannels.has(message.channel.id) && /https?:\/\/\S+/gi.test(message.content)) {
        await message.delete().catch(() => {});
        return message.channel.send(`${message.author}, Links are not allowed!`).then(m => setTimeout(() => m.delete(), 5000));
    }
    if (antiMentionChannels.has(message.channel.id) && message.mentions.members.size >= 5) {
        await message.delete().catch(() => {});
        return message.channel.send(`${message.author}, Mass mentions are not allowed!`).then(m => setTimeout(() => m.delete(), 5000));
    }
    if (antiSpamChannels.has(message.channel.id)) {
        const key = `${message.guild.id}-${message.author.id}`;
        if (!warnings[key]) warnings[key] = [];
        warnings[key].push(Date.now());
        warnings[key] = warnings[key].filter(t => Date.now() - t < 5000);
        if (warnings[key].length >= 6) {
            await message.delete().catch(() => {});
            if (warnings[key].length === 8) await message.member.timeout(60000, "Spamming");
        }
    }
});
client.on("voiceStateUpdate", async (oldState, newState) => {
    if (oldState.member.user.bot) return;
    const guild = oldState.guild;
    let embed = new EmbedBuilder().setTimestamp().setAuthor({ name: oldState.member.user.tag, iconURL: oldState.member.user.displayAvatarURL() });
    if (!oldState.channelId && newState.channelId) {
        embed.setColor("#2ECC71").setTitle("Voice Channel Joined").setDescription(`Member joined <#${newState.channelId}>`);
    } else if (oldState.channelId && !newState.channelId) {
        embed.setColor("#E74C3C").setTitle("Voice Channel Left").setDescription(`Member left <#${oldState.channelId}>`);
    } else if (oldState.channelId !== newState.channelId) {
        embed.setColor("#3498DB").setTitle("Voice Channel Moved").setDescription(`Moved from <#${oldState.channelId}> to <#${newState.channelId}>`);
    } else return;
    await sendLog(guild, LOG_CHANNELS.VC, embed);
});
client.on('guildMemberAdd', async member => {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (channel) {
        const welcomeEmbed = new EmbedBuilder()
            .setColor("#8B0000")
            .setTitle("Welcome to Tec Trader")
            .setDescription(`Welcome <@${member.id}> to **Tec Trader**!\n\n• Read the rules & TOS: <#1337263610321305650>\n• Need support? Create a ticket: <#1337266092812406844>\n• Leave your vouch / feedback here: <#1403799364706767019>`)
            .addFields({ name: "Total Members", value: `${member.guild.memberCount}`, inline: true })
            .setThumbnail(member.user.displayAvatarURL({ forceStatic: true }))
            .setFooter({ text: "Tec Trader • Enjoy your stay!" })
            .setTimestamp();
        await channel.send({ content: `<@${member.id}>`, embeds: [welcomeEmbed] });
    }
    const log = new EmbedBuilder().setColor("#2ECC71").setTitle("Member Joined").setThumbnail(member.user.displayAvatarURL()).addFields({ name: "User", value: `${member.user.tag} (${member.id})` }, { name: "Created At", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` }).setTimestamp();
    await sendLog(member.guild, LOG_CHANNELS.JOIN, log);
});
client.on('guildMemberRemove', async member => {
    const channel = member.guild.channels.cache.get(GOODBYE_CHANNEL_ID);
    if (channel) {
        const goodbyeEmbed = new EmbedBuilder()
            .setColor("#8B0000")
            .setTitle("Tec Trader")
            .setDescription(`**${member.user.tag}** has left the shadows...\n\nThe darkness will miss you.\nCome back anytime...`)
            .setThumbnail(member.user.displayAvatarURL({ forceStatic: true }))
            .setImage("https://cdn.discordapp.com/attachments/1337788828051701873/1480098172075376743/standard_1.gif")
            .setAuthor({ name: "Tec Trader", iconURL: client.user.displayAvatarURL({ forceStatic: true }) })
            .setFooter({ text: "Tec Trader • The Void Awaits" })
            .setTimestamp();
        await channel.send({ embeds: [goodbyeEmbed] });
    }
    const log = new EmbedBuilder().setColor("#E74C3C").setTitle("Member Left").setThumbnail(member.user.displayAvatarURL()).addFields({ name: "User", value: `${member.user.tag} (${member.id})` }).setTimestamp();
    await sendLog(member.guild, LOG_CHANNELS.JOIN, log);
});
client.login(TOKEN);
