
// ...existing code...
// ...existing code...

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('timeout')
  .setDescription('Timeout a user for a specified duration')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('User to timeout')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option.setName('duration')
      .setDescription('Timeout duration in minutes')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('Reason for timeout')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const duration = interaction.options.getInteger('duration');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: 'User not found in this server.', flags: 64 });
    return;
  }
  await member.timeout(duration * 60 * 1000, reason);
  const embed = new EmbedBuilder()
    .setTitle('User Timed Out')
    .addFields(
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Duration', value: `${duration} minutes`, inline: true },
      { name: 'Reason', value: reason, inline: false }
    )
    .setColor(0x00BFFF)
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

export default { data, execute };
