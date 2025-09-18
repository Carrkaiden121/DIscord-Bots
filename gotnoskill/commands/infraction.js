
import { SlashCommandBuilder, EmbedBuilder, ChannelType } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('infraction')
  .setDescription('Issue an infraction to a user')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user to punish')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('type')
      .setDescription('Type of infraction')
      .setRequired(true)
      .addChoices(
        { name: 'Warning', value: 'Warning' },
        { name: 'Infraction', value: 'Infraction' },
        { name: 'Termination', value: 'Termination' }
      )
  )
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('Reason for the infraction')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('staffnotes')
      .setDescription('Staff notes (private)')
      .setRequired(true)
  );

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const type = interaction.options.getString('type');
  const reason = interaction.options.getString('reason');
  const staffnotes = interaction.options.getString('staffnotes');

  const embed = new EmbedBuilder()
    .setTitle('Infraction Issued')
    .addFields(
      { name: 'User', value: `<@${user.id}>`, inline: true },
      { name: 'Type', value: type, inline: true },
      { name: 'Reason', value: reason, inline: false },
      { name: 'Staff Notes', value: staffnotes, inline: false }
    )
    .setColor(0xFF0000)
    .setTimestamp();

  // Reply in the channel
  await interaction.reply({ embeds: [embed] });

  // Create a thread for staff-proofing
  try {
    const threadName = `Staff Proof - ${user.username}`;
    const thread = await interaction.channel.threads.create({
      name: threadName,
      autoArchiveDuration: 1440, // 24 hours
      type: ChannelType.PublicThread,
      reason: 'Staff-proof for issued infraction'
    });
    await thread.send({ embeds: [embed] });
  } catch (err) {
    console.error('Failed to create staff-proof thread:', err);
  }
}

export default { data, execute };
