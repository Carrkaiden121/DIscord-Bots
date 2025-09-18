import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Ban a user from the server')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('User to ban')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('Reason for ban')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: 'User not found in this server.', flags : 64 });
    return;
  }
  await member.ban({ reason });
  const embed = new EmbedBuilder()
    .setTitle('User Banned')
    .addFields(
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Reason', value: reason, inline: false }
    )
    .setColor(0xFF0000)
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}


// ...existing code...
// ...existing code...

export default { data, execute };
