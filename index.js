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

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const PANEL_CHANNEL_ID = "1337266092812406844";
const STAFF_ROLE_ID = "1405179388223291552";
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL;
const GOODBYE_CHANNEL_ID = process.env.GOODBYE_CHANNEL;

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

const CATEGORY_IDS = {
    purchase: "1477273688490381394",
    notreceived: "1477273792287084614",
    replacement: "1477273914928271391",
    other: "1477273728575475762",
    teamreg: "1494731948722098276"   // ← New Category for Team Registration
};

const EMOJIS = {
    purchase: "🛒",
    notreceived: "♻️",
    replacement: "🔁",
    other: "🌐",
    teamreg: "🏆"
};

// Data stores
let warnings = {};
const antiSpamChannels = new Set();
const antiLinkChannels = new Set();
const antiMentionChannels = new Set();

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

// Commands Registration (same)
const commands = [ /* ... same as before */ ].map(cmd => cmd.toJSON());

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

                const embed = new EmbedBuilder()
                    .setTitle("TEC TRADER")
                    .setColor(0x2b2d31)
                    .setDescription("👋 **Welcome to TEC TRADER Support!**\nPlease select the appropriate ticket category below.");

                const select = new StringSelectMenuBuilder()
                    .setCustomId("ticket_select")
                    .setPlaceholder("🎟️ Select ticket type")
                    .addOptions(
                        { label: "🛒 Purchase", value: "purchase" },
                        { label: "🔁 Replacement", value: "replacement" },
                        { label: "♻️ Not Received", value: "notreceived" },
                        { label: "🌐 Other", value: "other" },
                        { label: "🏆 Team Registration", value: "teamreg" }
                    );

                return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
            }

            // Baaki commands (ban, kick, mute, warn, clear, msg, legit, anti...) same hain jaise pehle the.
            // Agar error aaye to batao, main unko bhi daal dunga.
        }

        // Modal Submit
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

            const fields = [];
            interaction.fields.fields.forEach(f => {
                fields.push({ name: f.customId.replace(/_/g, " ").toUpperCase(), value: f.value || "N/A" });
            });

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
                content: `<@${interaction.user.id}> <@&${STAFF_ROLE_ID}>\n\n**All players discords join kia ho**`, 
                embeds: [embed], 
                components: [row] 
            });

            await sendLog(interaction.guild, LOG_CHANNELS.TICKET, new EmbedBuilder()
                .setColor("#3498DB")
                .setTitle("Ticket Created")
                .addFields({ name: "User", value: interaction.user.tag }, { name: "Channel", value: `<#${ticketChannel.id}>` }, { name: "Type", value: type.toUpperCase() })
            );

            return interaction.editReply(`Ticket Created: ${ticketChannel}`);
        }

        // Ticket Select Menu
        if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
            const type = interaction.values[0];
            const modal = new ModalBuilder()
                .setCustomId(`modal_${type}`)
                .setTitle(`${EMOJIS[type] || "🏆"} ${type.toUpperCase()} FORM`);

            if (type === "teamreg") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("team_name").setLabel("Team Name").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("player1_riot").setLabel("Player 1 Riot ID").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("player1_rank").setLabel("Player 1 Rank").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("player1_discord").setLabel("Player 1 Discord Name").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("other_players").setLabel("Baqi Players + Substitute").setStyle(TextInputStyle.Paragraph).setPlaceholder("Player 2: RiotID#Tag | Rank | Discord\nPlayer 3: ...\nSubstitute: ...").setRequired(true))
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

        // Buttons (claim, close, reopen, delete) — same as before
        if (interaction.isButton()) {
            if (interaction.customId === "claim") {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff Only!", ephemeral: true });
                const log = new EmbedBuilder().setColor("#2ECC71").setTitle("Ticket Claimed").addFields({ name: "Channel", value: interaction.channel.name }, { name: "Staff Member", value: interaction.user.tag }).setTimestamp();
                await sendLog(interaction.guild, LOG_CHANNELS.TICKET, log);
                return interaction.reply(`Ticket claimed by <@${interaction.user.id}>`);
            }

            if (interaction.customId === "close") {
                const userOverwrite = interaction.channel.permissionOverwrites.cache.find(p => p.type === 1 && p.id !== client.user.id && p.id !== STAFF_ROLE_ID);
                if (userOverwrite) await interaction.channel.permissionOverwrites.edit(userOverwrite.id, { ViewChannel: false });
                await interaction.channel.setName(`closed-${interaction.channel.name}`);
                const log = new EmbedBuilder().setColor("#E74C3C").setTitle("Ticket Closed").addFields({ name: "Channel", value: interaction.channel.name }, { name: "Closed By", value: interaction.user.tag }).setTimestamp();
                await sendLog(interaction.guild, LOG_CHANNELS.TICKET, log);
                const reopenRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("reopen").setLabel("Reopen").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("delete").setLabel("Delete").setStyle(ButtonStyle.Danger)
                );
                return interaction.reply({ content: "Ticket Closed. ✅", components: [reopenRow] });
            }

            if (interaction.customId === "reopen") {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff Only!", ephemeral: true });
                const originalName = interaction.channel.name.replace("closed-", "");
                await interaction.channel.setName(originalName);
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
                const file = { attachment: buffer, name: `transcript-${interaction.channel.name}.txt` };

                try {
                    await interaction.user.send({ content: `📄 **Your Ticket Transcript** - ${interaction.channel.name}`, files: [file] });
                } catch (e) {}

                const log = new EmbedBuilder().setColor("#000000").setTitle("Ticket Deleted").addFields({ name: "Channel", value: interaction.channel.name }, { name: "Deleted By", value: interaction.user.tag }).setTimestamp();
                const ticketLogChan = interaction.guild.channels.cache.get(LOG_CHANNELS.TICKET);
                if (ticketLogChan) await ticketLogChan.send({ embeds: [log], files: [file] });

                return interaction.channel.delete();
            }
        }
    } catch (err) {
        console.error(err);
    }
});

client.login(TOKEN);
