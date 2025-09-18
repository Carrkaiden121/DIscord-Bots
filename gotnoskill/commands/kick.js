
import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Kick a user from the server')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('User to kick')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('Reason for kick')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: 'User not found in this server.', flags : 64 });
    return;
  }
  await member.kick(reason);
  const embed = new EmbedBuilder()
    .setTitle('User Kicked')
    .addFields(
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Reason', value: reason, inline: false }
    )
    .setColor(0xFFA500)
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

export default { data, execute };
