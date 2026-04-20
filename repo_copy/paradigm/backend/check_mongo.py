import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb://localhost:27017', serverSelectionTimeoutMS=2000)
    try:
        await client.admin.command('ping')
        print('mongo-ok')
    except Exception as e:
        print('mongo-fail', e)
    finally:
        client.close()

if __name__ == '__main__':
    asyncio.run(main())
