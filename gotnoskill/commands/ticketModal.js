export const data = undefined; // No slash command for this module
export const execute = undefined; // No direct execute for this module
// ...existing code...
// ...existing code...
// ...existing code...
export default { data, execute };
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, InteractionType, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { setFlagsFromString } from 'v8';

export function handleTicketTypeSelect(interaction) {
  // Get the selected value from the select menu
  const selected = interaction.values?.[0] || 'general_support';
  let ticketType = 'gen';
  if (selected.startsWith('management')) ticketType = 'man';
  else if (selected.startsWith('executive')) ticketType = 'exec';
  else if (selected.startsWith('ia')) ticketType = 'ia';
  else if (selected.startsWith('partnership')) ticketType = 'part';
  else if (selected.startsWith('other')) ticketType = 'other';

  const modal = new ModalBuilder()
    .setCustomId(`ticket_reason_modal_${ticketType}`)
    .setTitle('Ticket Reason');

  const reasonInput = new TextInputBuilder()
    .setCustomId('ticket_reason')
    .setLabel('Please describe your issue or request')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMinLength(10)
    .setMaxLength(500);

  const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
  modal.addComponents(firstActionRow);
  interaction.showModal(modal);
}

export async function handleTicketReasonModal(interaction) {
  const reason = interaction.fields.getTextInputValue('ticket_reason');
  if (reason.length < 10) {
    await interaction.reply({ content: 'Your reason must be at least 10 characters long.', flags: 64 });
    return;
  }

  let ticketType = 'gen';
  if (interaction.customId && interaction.customId.startsWith('ticket_reason_modal_')) {
    const type = interaction.customId.replace('ticket_reason_modal_', '');
    if (type) ticketType = type;
  }

  // Generate a ticket id (short random string)
  const ticketId = Math.random().toString(36).substring(2, 8);
  const username = interaction.user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const channelName = `${ticketType}-${username}-${ticketId}`;

  // Create the channel in the same guild as the interaction
  const guild = interaction.guild;
  let channel;
  try {
    channel = await guild.channels.create({
      name: channelName,
      type: 0, // GUILD_TEXT
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: ['ViewChannel'],
        },
        {
          id: interaction.user.id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
        },
        // Add staff/support role here if needed
      ],
      reason: `Ticket created by ${interaction.user.tag}`,
    });
    // Fetch member for join date
    const member = await guild.members.fetch(interaction.user.id);
    const creationDate = `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:F>`;
    const joinDate = member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : 'Unknown';

    // Map ticketType to readable title
    const typeTitles = {
      gen: 'General Support',
      man: 'Management Support',
      exec: 'Executive Support',
      ia: 'IA Support',
      part: 'Partnership Inquiry',
      other: 'Other',
    };
    const ticketTitle = typeTitles[ticketType] || 'Support Ticket';

    const embed = new EmbedBuilder()
      .setTitle(ticketTitle)
  .setDescription(`__Member Details__\nUsername: ${interaction.user.tag}\nUserID: ${interaction.user.id}\nCreation date: ${creationDate}\nJoin date: ${joinDate}\n\nTicket Reason:\n${reason}\n\nTicket ID: \

\`${ticketId}\``)
      .setColor(0x2b2d31)
      .setTimestamp();

    // Add Claim/Unclaim and Close buttons
    const claimButton = new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('Claim')
      .setStyle(ButtonStyle.Success);
    const closeButton = new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Close')
      .setStyle(ButtonStyle.Danger);
    const actionRow = new ActionRowBuilder().addComponents(claimButton, closeButton);

    await channel.send({ content: `Ticket created by <@${interaction.user.id}>`, embeds: [embed], components: [actionRow] });
    await interaction.reply({ content: `Your ticket has been created: <#${channel.id}>`, flags: 64 });
  } catch (err) {
    await interaction.reply({ content: 'There was an error creating your ticket channel.', flags: 64 });
  }
}
