
// ...existing code...
// ...existing code...

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('session')
  .setDescription('Session commands')
  .addSubcommand(sub => sub.setName('start').setDescription('Start a session'))
  .addSubcommand(sub => sub.setName('vote').setDescription('Vote in a session'))
  .addSubcommand(sub => sub.setName('low').setDescription('Mark session as low'))
  .addSubcommand(sub => sub.setName('full').setDescription('Mark session as full'))
  .addSubcommand(sub => sub.setName('end').setDescription('End the session'));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  let embed;
  switch (sub) {
    case 'start':
      embed = new EmbedBuilder()
        .setTitle('Session Started')
        .setDescription('A new session has begun! Get ready to participate and have fun. Invite your friends to join and make the most of this session. Let the activities begin!')
        .setImage('https://cdn.discordapp.com/attachments/1356172502014890044/1388481945842749530/image.png?ex=68a5b214&is=68a46094&hm=eeb2d50571fc4f68e68bb2dc3d9d47e0f0b228a63eed998e7a40da3946a2700d&');
      break;
    case 'vote':
      embed = new EmbedBuilder()
        .setTitle('Vote Registered')
        .setDescription('Your vote has been counted. Thank you for making your voice heard! Every vote helps shape the session.')
        .setImage('https://cdn.discordapp.com/attachments/1356172502014890044/1388482243181281320/image.png?ex=68a5b25b&is=68a460db&hm=c26ad6e0ba6b916c9b512d3ffc569b2c2fce4eec31cb3a8d406c44f120686b22&');
      break;
    case 'low':
      embed = new EmbedBuilder()
        .setTitle('Session Marked as Low')
        .setDescription('The session is now marked as low. Fewer participants are currently active. Feel free to invite others or check back later!')
        .setImage('https://cdn.discordapp.com/attachments/1356172502014890044/1388482108984397856/image.png?ex=68a5b23b&is=68a460bb&hm=7ebd53be3c959afe9cee62e84b5195bdddd5c0af71aba487124db235d173dd42&');
      break;
    case 'full':
      embed = new EmbedBuilder()
        .setTitle('Session Full')
        .setDescription('The session is now full. Thanks for your enthusiasm! Please wait for the next session if you couldn\'t join this time.')
        .setImage('https://cdn.discordapp.com/attachments/1356172502014890044/1388481973785329745/Screenshot_2025-06-28_170046.png?ex=68a5b21b&is=68a4609b&hm=813b94fe7813538c7820119cc169e435355cd3d41ddeb5dd7f5a76e5d31a555f&');
      break;
    case 'end':
      embed = new EmbedBuilder()
        .setTitle('Session Ended')
        .setDescription('The session has ended. Thank you for participating! We hope to see you again in the next one.')
        .setImage('https://cdn.discordapp.com/attachments/1356172502014890044/1388482673722392676/Screenshot_2025-06-28_170326.png?ex=68a5b2c2&is=68a46142&hm=05551db2e607f1fa048b1811ec5dc688d1ddf1b8861b84c6086181a569b6fad5&');
      break;
    default:
      embed = new EmbedBuilder()
        .setTitle('Unknown Command')
        .setDescription('Unknown session subcommand.');
  }
  await interaction.reply({ embeds: [embed] });
}

export default { data, execute };
