import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed execution...');
  
  // 1. Seed default user accounts
  const defaultUsers = [
    { username: 'tharun_sai', email: 'tharun@example.com', password: '325698abc', name: 'Tharun Sai', bio: 'Fusing Artificial Intelligence with Software Design. Crafting modern interfaces and building high-performance systems. VS Code is my canvas.', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150' },
    { username: 'tharun_battu', email: 'tharun_battu@example.com', password: '325698abc', name: 'Tharun Battu', bio: 'Software Engineer. Building reliable backend systems and cloud architectures.', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
    { username: 'srinivas_bikki', email: 'srinivas@example.com', password: '325698abc', name: 'Srinivas Bikki', bio: 'System Specialist. Designing scalable database structures and optimized network layers.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
    { username: 'srinitha_bathula', email: 'srinitha@example.com', password: '325698abc', name: 'Srinitha Bathula', bio: 'Product Manager. Crafting products from ideation to production. Lover of minimalist interfaces.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    { username: 'chandu_doaddapaneni', email: 'chandu@example.com', password: '325698abc', name: 'Chandu Doaddapaneni', bio: 'Database Engineer. Making data queries run at lightning speed. Space enthusiast.', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    { username: 'madhu_chippala', email: 'madhu@example.com', password: '325698abc', name: 'Madhu Chippala', bio: 'Frontend Developer. Animating the web one transition at a time. JavaScript fan.', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150' },
    { username: 'sailu_betha', email: 'sailu@example.com', password: '325698abc', name: 'Sailu Betha', bio: 'UI Designer. Passionate about color harmony, typography, and dark mode layouts.', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
    
    // Requested Seeding Accounts
    { username: 'akhila_nalajala', email: 'akhila@example.com', password: '325698abc', name: 'Akhila Nalajala', bio: 'Developer. Building high-performance visual components.', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
    { username: 'gayathri_daggubati', email: 'gayathri@example.com', password: '325698abc', name: 'Gayathri Daggubati', bio: 'Designer. Designing elegant, responsive user layouts.', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    { username: 'sreehasa_mandalapu', email: 'sreehasa@example.com', password: '325698abc', name: 'Sreehasa Mandalapu', bio: 'Software Engineer. Writing reliable frontend features.', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
    { username: 'venkat_prakash', email: 'venkat@example.com', password: '325698abc', name: 'Venkat Prakash Pulavarthi', bio: 'Database Specialist. Query optimizations and SQL procedures.', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150' },
    { username: 'sowmya_jonnalagadda', email: 'sowmya@example.com', password: '325698abc', name: 'Sowmya Jonnalagadda', bio: 'Product Analyst. Analyzing user engagement metrics.', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150' }
  ];

  const userRecords = {};

  for (const user of defaultUsers) {
    const existing = await prisma.user.findUnique({
      where: { username: user.username }
    });

    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      const created = await prisma.user.create({
        data: {
          username: user.username,
          email: user.email,
          password: hashedPassword,
          name: user.name,
          bio: user.bio,
          avatar: user.avatar
        }
      });
      console.log(`Created user: ${user.username}`);
      userRecords[user.username] = created;
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { password: hashedPassword }
      });
      console.log(`Updated user seed password: ${user.username}`);
      userRecords[user.username] = updated;
    }
  }

  // 2. Seed Posts
  const postCount = await prisma.post.count();
  if (postCount === 0) {
    console.log('Seeding default posts...');
    
    const postsToSeed = [
      {
        userId: userRecords['srinivas_bikki'].id,
        type: 'image',
        img: 'cyberNetwork',
        caption: 'Finished the layout optimization checks. System metrics look healthy. All system modules are stable! 💻🛡️'
      },
      {
        userId: userRecords['srinitha_bathula'].id,
        type: 'caesar',
        caption: 'Solved our intercepted cipher string sequence. Comment your decoded plaintext to register authorization key!'
      },
      {
        userId: userRecords['chandu_doaddapaneni'].id,
        type: 'code',
        caption: 'Auditing memory buffers in backend systems. Safe allocations ensure no performance lags!'
      },
      {
        userId: userRecords['tharun_sai'].id,
        type: 'gradient',
        title: 'System Layout',
        content: 'Dark mode tokens integrated.'
      },
      {
        userId: userRecords['tharun_sai'].id,
        type: 'text',
        content: 'Fusing clean components in VS Code. React hot reloading runs smoothly!'
      }
    ];

    const seededPosts = [];
    for (const post of postsToSeed) {
      const createdPost = await prisma.post.create({
        data: post
      });
      seededPosts.push(createdPost);
    }

    // 3. Seed Comments
    console.log('Seeding default comments...');
    await prisma.comment.create({
      data: {
        userId: userRecords['chandu_doaddapaneni'].id,
        postId: seededPosts[0].id,
        text: 'Looking clean! System metrics look healthy.'
      }
    });

    await prisma.comment.create({
      data: {
        userId: userRecords['sailu_betha'].id,
        postId: seededPosts[1].id,
        text: 'The answer is: "The portal is secure"!'
      }
    });

    // 4. Seed Follows
    console.log('Seeding default follows...');
    await prisma.follow.create({
      data: {
        followerId: userRecords['srinivas_bikki'].id,
        followingId: userRecords['tharun_sai'].id
      }
    });
    await prisma.follow.create({
      data: {
        followerId: userRecords['srinitha_bathula'].id,
        followingId: userRecords['tharun_sai'].id
      }
    });

    // 5. Seed Messages & Chats
    console.log('Seeding default chats & messages...');
    
    // Create Chat session first
    const chat = await prisma.chat.create({
      data: {
        user1Id: Math.min(userRecords['srinivas_bikki'].id, userRecords['tharun_sai'].id),
        user2Id: Math.max(userRecords['srinivas_bikki'].id, userRecords['tharun_sai'].id)
      }
    });

    await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: userRecords['srinivas_bikki'].id,
        receiverId: userRecords['tharun_sai'].id,
        text: 'The new backend modules are running. Did you check the Caesar puzzle?',
        status: 'read'
      }
    });

    await prisma.message.create({
      data: {
        chatId: chat.id,
        senderId: userRecords['tharun_sai'].id,
        receiverId: userRecords['srinivas_bikki'].id,
        text: 'Checking it out now!',
        status: 'sent'
      }
    });
  }

  console.log('Seed execution finished successfully.');
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
