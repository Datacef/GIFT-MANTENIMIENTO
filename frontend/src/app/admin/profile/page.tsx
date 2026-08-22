'use client';
import Banner from 'components/admin/profile/Banner';
import General from 'components/admin/profile/General';
import ChangePassword from 'components/admin/profile/ChangePassword';

const ProfileOverview = () => {
  return (
    <div className="flex w-full flex-col gap-5 lg:gap-5">
      <div className="w-full mt-3 flex h-fit flex-col gap-5 lg:grid lg:grid-cols-12">
        <div className="col-span-12 lg:col-span-4 lg:mb-0 flex flex-col gap-5">
          <Banner />
          <ChangePassword />
        </div>

        <div className="col-span-12 lg:col-span-8 lg:mb-0">
          <General />
        </div>
      </div>
    </div>
  );
};

export default ProfileOverview;
