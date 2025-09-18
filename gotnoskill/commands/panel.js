import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';


export const data = new SlashCommandBuilder()
  .setName('panel')
  .setDescription('Show a panel for Ticket or Verify')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand
      .setName('ticket')
      .setDescription('Show the support/ticket panel')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Channel to send the panel (required)')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('verify')
      .setDescription('Show the verification panel')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Channel to send the verification panel (required)')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  );


export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const channel = interaction.options.getChannel('channel');

  if (sub === 'ticket') {
    const embed = new EmbedBuilder()
      .setTitle('Support Panel')
      .setDescription('Select the type of support you need from the dropdown below, or click the button to open a general support ticket.');

    const select = new StringSelectMenuBuilder()
      .setCustomId('ticket_type_select')
      .setPlaceholder('Choose your support type...')
      .addOptions([
        {
          label: 'General Support',
          value: 'general_support',
          description: 'Get help with general questions or issues.',
          emoji: '🎫',
        },
        {
          label: 'Management Support',
          value: 'management_support',
          description: 'Contact management for special concerns.',
          emoji: '🔐',
        },
        {
          label: 'Executive Support',
          value: 'executive_support',
          description: 'Reach out to executive staff.',
          emoji: '🕰️',
        },
        {
          label: 'IA Support',
          value: 'ia_support',
          description: 'Internal Affairs support.',
          emoji: '🗒️',
        },
        {
          label: 'Partnership Inquiry',
          value: 'partnership_inquiry',
          description: 'Inquire about partnerships.',
          emoji: '🤝',
        },
        {
          label: 'Others',
          value: 'other_support',
          description: 'Other support needs.',
          emoji: '❓',
        },
      ]);

  const selectRow = new ActionRowBuilder().addComponents(select);

  await channel.send({ embeds: [embed], components: [selectRow] });
  await interaction.reply({ content: `Support panel sent to ${channel}.`, flags : 64 });
  return;
  }

  if (sub === 'verify') {
    const embed = new EmbedBuilder()
      .setTitle('Verification')
      .setDescription('Click the button below to verify yourself and gain access to the server.');

    const verifyButton = new ButtonBuilder()
      .setCustomId('verify_button')
      .setLabel('Verify')
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(verifyButton);

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `Verification panel sent to ${channel}.`, flags: 64 });
    return;
  }
}


// ...existing code...
// ...existing code...

export default { data, execute };
