import dotenv from 'dotenv';
dotenv.config();
import { 
  Client, GatewayIntentBits, Collection, ChannelType, ModalBuilder, 
  TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, 
  ButtonBuilder, ButtonStyle, REST, Routes 
} from 'discord.js';
import { handleTicketTypeSelect, handleTicketReasonModal } from './commands/ticketModal.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const TICKET_LOG_CHANNEL_ID = '1404263985829904505';
const ticketOpeners = new Map();
const STAFF_ROLE_ID = '1396500969612640297';
const claimedTickets = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const { default: command } = await import(`./commands/${file}`);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

// Interaction handler
client.on('interactionCreate', async interaction => {
  // Handle slash commands
  if (interaction.isChatInputCommand && interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
      }
    }
    return;
  }

  // Handle ticket type select dropdown
  if (interaction.isStringSelectMenu && interaction.customId === 'ticket_type_select') {
    try {
      await handleTicketTypeSelect(interaction);
    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.reply({ content: 'There was an error handling your ticket selection.', ephemeral: true });
      }
    }
    return;
  }
  // Handle Claim/Unclaim button
  if (interaction.isButton() && interaction.customId === 'ticket_claim') {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      await interaction.reply({ content: 'You do not have permission to claim this ticket.', ephemeral: true });
      return;
    }

    if (claimedTickets.get(interaction.channel.id) === interaction.user.id) {
      claimedTickets.delete(interaction.channel.id);
      const unclaimButton = new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Claim')
        .setStyle(ButtonStyle.Success);
      const closeButton = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder().addComponents(unclaimButton, closeButton);
      await interaction.message.edit({ components: [row] });
      await interaction.reply({ content: 'You have unclaimed this ticket.', ephemeral: true });
      return;
    }

    claimedTickets.set(interaction.channel.id, interaction.user.id);
    const claimButton = new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('Unclaim')
      .setStyle(ButtonStyle.Danger);
    const closeButton = new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Close')
      .setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(claimButton, closeButton);
    await interaction.message.edit({ components: [row] });

    const claimEmbed = new EmbedBuilder()
      .setDescription(`<@${interaction.user.id}> has claimed the ticket.`)
      .setColor(0x57f287)
      .setTimestamp();

    await interaction.channel.send({ embeds: [claimEmbed] });
    await interaction.reply({ content: 'You have claimed this ticket.', ephemeral: true });
    return;
  }

  // Handle Close button
  if (interaction.isButton() && interaction.customId === 'ticket_close') {
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      await interaction.reply({ content: 'You do not have permission to close this ticket.', ephemeral: true });
      return;
    }
    const modal = new ModalBuilder()
      .setCustomId('ticket_close_modal')
      .setTitle('Close Ticket');
    const reasonInput = new TextInputBuilder()
      .setCustomId('close_reason')
      .setLabel('Reason for closing')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMinLength(5)
      .setMaxLength(500);
    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    await interaction.showModal(modal);
    return;
  }

  // Handle close modal
  if (interaction.isModalSubmit() && interaction.customId === 'ticket_close_modal') {
    const reason = interaction.fields.getTextInputValue('close_reason');
    const closer = interaction.user;
    const closeEmbed = new EmbedBuilder()
      .setTitle('Ticket Closed')
      .setDescription(`Closed by <@${closer.id}>\nReason: ${reason}`)
      .setColor(0xed4245)
      .setTimestamp();
    await interaction.channel.send({ embeds: [closeEmbed] });
    await interaction.reply({ content: 'Ticket closed. This channel will be deleted in 5 seconds.', ephemeral: true });
    setTimeout(() => {
      if (interaction.channel && interaction.channel.deletable) {
        interaction.channel.delete('Ticket closed');
      }
    }, 5000);
    return;
  }

  // Handle ticket reason modal
  if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_reason_modal_')) {
    try {
      await handleTicketReasonModal(interaction);
    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.reply({ content: 'There was an error creating your ticket.', ephemeral: true });
      }
    }
    return;
  }
});

// Register slash commands
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const commands = [];
  for (const command of client.commands.values()) {
    if (command.data) commands.push(command.data.toJSON());
  }
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
});

// Bad word filter
let badwords = [];
const badwordsPath = path.join(__dirname, 'badwords.json');
try {
  badwords = JSON.parse(fs.readFileSync(badwordsPath, 'utf8'));
} catch (err) {
  console.error('Could not load badwords.json:', err);
}

const userOffenses = new Map();

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  const content = message.content.toLowerCase();
  if (badwords.some(word => content.includes(word))) {
    try {
      await message.delete();
      const userId = message.author.id;
      const now = Date.now();
      let offenses = userOffenses.get(userId) || [];
      offenses = offenses.filter(ts => now - ts < 60 * 60 * 1000);
      offenses.push(now);
      userOffenses.set(userId, offenses);

      let muteDuration = null;
      let warningMsg = `${message.author} You cannot say that here! If you continue, you will be muted.`;

      if (offenses.length === 2) {
        muteDuration = 10 * 60 * 1000;
        warningMsg = `${message.author} You have been muted for 10 minutes for repeated violations.`;
      } else if (offenses.length === 3) {
        muteDuration = 60 * 60 * 1000;
        warningMsg = `${message.author} You have been muted for 60 minutes for repeated violations.`;
      } else if (offenses.length >= 4) {
        muteDuration = 6 * 60 * 60 * 1000;
        warningMsg = `${message.author} You have been muted for 6 hours for repeated violations.`;
      }

      if (muteDuration) {
        try {
          const member = await message.guild.members.fetch(userId);
          if (member && member.moderatable) {
            await member.timeout(muteDuration, 'Repeated use of bad words');
          }
        } catch (err) {
          console.error('Failed to mute user:', err);
        }
      }

      await message.channel.send({ content: warningMsg });
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  }
});

// Login
client.login(process.env.TOKEN);
