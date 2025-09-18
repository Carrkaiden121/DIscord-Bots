const { Client, GatewayIntentBits, Collection, Events, PermissionFlagsBits, REST, Routes, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { EnhancedAntiRaidSystem } = require('./enhanced-antiraid.js');
const { ReactionRolesManager } = require('./reaction-roles.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
            console.log(`⚠️ Warning: The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

async function handleSaveServerCommand(message, args) {
    try {
        const guild = message.guild;
        const customFilename = args[0];
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = customFilename 
            ? `${customFilename}.json` 
            : `server-backup-${guild.name.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.json`;

        // Collect server data (same as slash command)
        const serverData = {
            serverInfo: {
                id: guild.id,
                name: guild.name,
                description: guild.description,
                icon: guild.iconURL(),
                banner: guild.bannerURL(),
                ownerId: guild.ownerId,
                createdAt: guild.createdAt.toISOString(),
                memberCount: guild.memberCount,
                boostLevel: guild.premiumTier,
                boostCount: guild.premiumSubscriptionCount,
                verificationLevel: guild.verificationLevel,
                explicitContentFilter: guild.explicitContentFilter,
                mfaLevel: guild.mfaLevel,
                savedAt: new Date().toISOString()
            },
            roles: [],
            categories: [],
            channels: [],
            permissions: {}
        };

        // Save roles with permissions
        guild.roles.cache.forEach(role => {
            if (role.name !== '@everyone') {
                serverData.roles.push({
                    id: role.id,
                    name: role.name,
                    color: role.hexColor,
                    position: role.position,
                    hoist: role.hoist,
                    mentionable: role.mentionable,
                    managed: role.managed,
                    permissions: role.permissions.toArray(),
                    permissionsBitfield: role.permissions.bitfield.toString()
                });
            }
        });

        // Sort roles by position
        serverData.roles.sort((a, b) => b.position - a.position);

        // Save channels and categories
        guild.channels.cache.forEach(channel => {
            const baseChannelData = {
                id: channel.id,
                name: channel.name,
                type: channel.type,
                position: channel.position,
                parentId: channel.parentId,
                createdAt: channel.createdAt.toISOString()
            };

            if (channel.type === ChannelType.GuildCategory) {
                // Category
                serverData.categories.push({
                    ...baseChannelData,
                    children: []
                });
            } else {
                // Regular channel
                const channelData = {
                    ...baseChannelData,
                    topic: channel.topic || null,
                    nsfw: channel.nsfw || false
                };

                // Add type-specific properties
                if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
                    channelData.rateLimitPerUser = channel.rateLimitPerUser;
                    channelData.defaultAutoArchiveDuration = channel.defaultAutoArchiveDuration;
                } else if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
                    channelData.bitrate = channel.bitrate;
                    channelData.userLimit = channel.userLimit;
                    channelData.rtcRegion = channel.rtcRegion;
                }

                serverData.channels.push(channelData);
            }

            // Save channel permissions
            serverData.permissions[channel.id] = {
                channelName: channel.name,
                channelType: channel.type,
                overwrites: []
            };

            channel.permissionOverwrites.cache.forEach(overwrite => {
                serverData.permissions[channel.id].overwrites.push({
                    id: overwrite.id,
                    type: overwrite.type,
                    allow: overwrite.allow.toArray(),
                    deny: overwrite.deny.toArray(),
                    allowBitfield: overwrite.allow.bitfield.toString(),
                    denyBitfield: overwrite.deny.bitfield.toString()
                });
            });
        });

        // Organize channels under their categories
        serverData.categories.forEach(category => {
            category.children = serverData.channels
                .filter(channel => channel.parentId === category.id)
                .sort((a, b) => a.position - b.position);
        });

        // Sort categories and channels by position
        serverData.categories.sort((a, b) => a.position - b.position);
        serverData.channels.sort((a, b) => a.position - b.position);

        // Create backups directory if it doesn't exist
        const backupsDir = path.join(__dirname, 'server-backups');
        try {
            await fs.promises.access(backupsDir);
        } catch {
            await fs.promises.mkdir(backupsDir, { recursive: true });
        }

        // Write to file
        const filePath = path.join(backupsDir, filename);
        await fs.promises.writeFile(filePath, JSON.stringify(serverData, null, 2), 'utf8');

        // Send success message
        const stats = await fs.promises.stat(filePath);
        await message.reply({
            embeds: [{
                color: 0x00ff00,
                title: '💾 Server Backup Created',
                fields: [
                    { name: 'Server', value: guild.name, inline: true },
                    { name: 'Backup Created By', value: message.author.tag, inline: true },
                    { name: 'File', value: filename, inline: true },
                    { name: 'Roles Saved', value: serverData.roles.length.toString(), inline: true },
                    { name: 'Categories Saved', value: serverData.categories.length.toString(), inline: true },
                    { name: 'Channels Saved', value: serverData.channels.length.toString(), inline: true },
                    { name: 'Location', value: `\`${filePath}\``, inline: false },
                    { name: 'File Size', value: `${Math.round(stats.size / 1024)} KB`, inline: true }
                ],
                timestamp: new Date().toISOString(),
                footer: { text: 'Server backup completed' }
            }]
        });

        console.log(`Server backup created: ${filePath} by ${message.author.tag}`);
    } catch (error) {
        console.error('Error creating server backup:', error);
        await message.reply('❌ There was an error creating the server backup. Make sure I have the necessary permissions to read server data and write files.');
    }
}

async function handleLoadServerCommand(message, args) {
    try {
        if (!args[0]) {
            return await message.reply('❌ Please provide a filename. Usage: `!loadserver filename`');
        }

        const filename = args[0].endsWith('.json') ? args[0] : `${args[0]}.json`;
        const filePath = path.join(__dirname, 'server-backups', filename);

        // Check if file exists
        try {
            await fs.promises.access(filePath);
        } catch {
            return await message.reply(`❌ Backup file \`${filename}\` not found in server-backups directory.`);
        }

        // Read and parse backup file
        const backupData = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
        const guild = message.guild;

        await message.reply('🔄 Starting server restore process... This may take a while.');

        let restored = {
            roles: 0,
            categories: 0,
            channels: 0,
            permissions: 0
        };
        let errors = [];

        // Restore roles (skip managed roles)
        for (const roleData of backupData.roles) {
            if (roleData.managed) continue;

            try {
                const existingRole = guild.roles.cache.find(r => r.name === roleData.name);
                if (!existingRole) {
                    await guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        hoist: roleData.hoist,
                        mentionable: roleData.mentionable,
                        permissions: roleData.permissions,
                        position: roleData.position
                    });
                    restored.roles++;
                }
            } catch (error) {
                errors.push(`Role "${roleData.name}": ${error.message}`);
            }
        }

        // Restore categories
        for (const categoryData of backupData.categories) {
            try {
                const existingCategory = guild.channels.cache.find(c => c.name === categoryData.name && c.type === ChannelType.GuildCategory);
                if (!existingCategory) {
                    await guild.channels.create({
                        name: categoryData.name,
                        type: ChannelType.GuildCategory,
                        position: categoryData.position
                    });
                    restored.categories++;
                }
            } catch (error) {
                errors.push(`Category "${categoryData.name}": ${error.message}`);
            }
        }

        // Restore channels
        for (const channelData of backupData.channels) {
            try {
                const existingChannel = guild.channels.cache.find(c => c.name === channelData.name && c.type === channelData.type);
                if (!existingChannel) {
                    const parentCategory = channelData.parentId ? 
                        guild.channels.cache.find(c => backupData.categories.some(cat => cat.id === channelData.parentId && c.name === cat.name)) : 
                        null;

                    const channelOptions = {
                        name: channelData.name,
                        type: channelData.type,
                        position: channelData.position,
                        parent: parentCategory?.id || null
                    };

                    if (channelData.topic) channelOptions.topic = channelData.topic;
                    if (channelData.nsfw !== undefined) channelOptions.nsfw = channelData.nsfw;
                    if (channelData.rateLimitPerUser !== undefined) channelOptions.rateLimitPerUser = channelData.rateLimitPerUser;
                    if (channelData.bitrate) channelOptions.bitrate = channelData.bitrate;
                    if (channelData.userLimit) channelOptions.userLimit = channelData.userLimit;

                    await guild.channels.create(channelOptions);
                    restored.channels++;
                }
            } catch (error) {
                errors.push(`Channel "${channelData.name}": ${error.message}`);
            }
        }

        // Create completion embed
        const completionEmbed = {
            color: restored.roles + restored.categories + restored.channels > 0 ? 0x00ff00 : 0xff9900,
            title: '📥 Server Restore Completed',
            fields: [
                { name: 'Backup File', value: filename, inline: true },
                { name: 'Restored By', value: message.author.tag, inline: true },
                { name: 'Original Server', value: backupData.serverInfo.name, inline: true },
                { name: 'Roles Restored', value: restored.roles.toString(), inline: true },
                { name: 'Categories Restored', value: restored.categories.toString(), inline: true },
                { name: 'Channels Restored', value: restored.channels.toString(), inline: true }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Server restore completed' }
        };

        if (errors.length > 0) {
            completionEmbed.fields.push({
                name: 'Errors',
                value: errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''),
                inline: false
            });
        }

        await message.reply({ embeds: [completionEmbed] });
        console.log(`Server restore completed: ${filename} by ${message.author.tag}`);

    } catch (error) {
        console.error('Error loading server backup:', error);
        await message.reply('❌ There was an error loading the server backup. Make sure the file is valid and I have the necessary permissions.');
    }
}

// Utility function to check if user has required role
function hasRequiredRole(member, requiredRoles) {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    
    // Server owner always has access
    if (member.guild.ownerId === member.user.id) return true;
    
    return requiredRoles.some(roleNameOrId => {
        // Skip empty/undefined role IDs
        if (!roleNameOrId) return false;
        
        // Check by role ID first
        if (member.roles.cache.has(roleNameOrId)) return true;
        
        // Check by role name (case insensitive) as fallback
        return member.roles.cache.some(role => 
            role.name.toLowerCase() === roleNameOrId.toLowerCase()
        );
    });
}

// Utility function to check if user has required permissions
function hasRequiredPermissions(member, requiredPermissions) {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    
    return requiredPermissions.every(permission => 
        member.permissions.has(permission)
    );
}

// When the client is ready, run this code
client.once(Events.ClientReady, async readyClient => {
    console.log(`🤖 Bot is ready! Logged in as ${readyClient.user.tag}`);
    console.log(`📊 Serving ${readyClient.guilds.cache.size} guild(s)`);
    
    // Initialize Enhanced Anti-Raid System
    client.antiRaid = new EnhancedAntiRaidSystem(client);
    console.log('🛡️ Enhanced Anti-Raid system initialized');
    
    // Initialize Reaction Roles System
    client.reactionRoles = new ReactionRolesManager(client);
    console.log('🎭 Reaction Roles system initialized');
    
    // Set bot activity
    client.user.setActivity('Moderating the server', { type: 'WATCHING' });
    
    // Auto-register slash commands for the guild
    if (process.env.GUILD_ID) {
        try {
            console.log('🚀 Started refreshing application (/) commands...');
            
            const commands = [];
            client.commands.forEach(command => {
                if (command.data) {
                    commands.push(command.data.toJSON());
                }
            });
            
            const rest = new REST().setToken(process.env.DISCORD_TOKEN);
            
            const data = await rest.put(
                Routes.applicationGuildCommands(readyClient.user.id, process.env.GUILD_ID),
                { body: commands },
            );
            
            console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            console.error('❌ Error registering commands:', error);
        }
    } else {
        console.log('⚠️ No GUILD_ID provided in .env file. Commands will not be registered.');
    }
    
    // Setup reaction roles after a short delay to ensure everything is ready
    setTimeout(async () => {
        console.log('🎭 Setting up automatic reaction roles...');
        console.log(`📊 Client ready: ${client.isReady()}`);
        console.log(`📊 Guilds cached: ${client.guilds.cache.size}`);
        if (client.guilds.cache.size > 0) {
            const guild = client.guilds.cache.first();
            console.log(`📊 Channels cached in ${guild.name}: ${guild.channels.cache.size}`);
        }
        await client.reactionRoles.setupReactionRoles();
    }, 5000); // Increased to 5 second delay
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`❌ No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            // Check permissions before executing command
            const member = interaction.member;
            
            // Check if command requires specific roles
            if (command.requiredRoles) {
                if (!hasRequiredRole(member, command.requiredRoles)) {
                    return await interaction.reply({
                        content: `❌ You don't have the required role(s) to use this command: ${command.requiredRoles.join(', ')}`,
                        ephemeral: true
                    });
                }
            }
            
            // Check if command requires specific permissions
            if (command.requiredPermissions) {
                if (!hasRequiredPermissions(member, command.requiredPermissions)) {
                    const permissionNames = command.requiredPermissions.map(perm => 
                        Object.keys(PermissionFlagsBits).find(key => PermissionFlagsBits[key] === perm)
                    ).join(', ');
                    
                    return await interaction.reply({
                        content: `❌ You don't have the required permission(s) to use this command: ${permissionNames}`,
                        ephemeral: true
                    });
                }
            }

            // Execute the command
            await command.execute(interaction);
            console.log(`✅ ${interaction.user.tag} used /${interaction.commandName} in ${interaction.guild.name}`);
            
        } catch (error) {
            console.error(`❌ Error executing command ${interaction.commandName}:`, error);
            
            const errorMessage = {
                content: '❌ There was an error while executing this command!',
                ephemeral: true
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
    
    // Handle reaction roles dropdown
    if (interaction.isStringSelectMenu() && interaction.customId === 'reaction_roles_select') {
        await client.reactionRoles.handleRoleSelection(interaction);
    }
});

// Handle message commands (for !saveserver and !loadserver)
client.on(Events.MessageCreate, async message => {
    // Ignore bot messages and messages without the prefix
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Only handle saveserver and loadserver commands
    if (!['saveserver', 'loadserver'].includes(commandName)) return;

    try {
        const member = message.member;
        
        // Check for admin role (same as saveserver slash command)
        const adminRoleId = process.env.ADMIN_ROLE_ID;
        if (!hasRequiredRole(member, [adminRoleId])) {
            return await message.reply('❌ You need the Admin role to use this command.');
        }

        if (commandName === 'saveserver') {
            await handleSaveServerCommand(message, args);
        } else if (commandName === 'loadserver') {
            await handleLoadServerCommand(message, args);
        }

    } catch (error) {
        console.error(`❌ Error executing message command ${commandName}:`, error);
        await message.reply('❌ There was an error while executing this command!');
    }
});

// Handle errors
client.on(Events.Error, error => {
    console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

// Graceful shutdown handlers to save anti-raid data
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
    try {
        if (client.antiRaid) {
            console.log('💾 Saving anti-raid data...');
            client.antiRaid.savePersistedData();
        }
        await client.destroy();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
    try {
        if (client.antiRaid) {
            console.log('💾 Saving anti-raid data...');
            client.antiRaid.savePersistedData();
        }
        await client.destroy();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
